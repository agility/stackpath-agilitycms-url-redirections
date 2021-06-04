#!/usr/bin/env nodes
var request = require('request')
var argv = require('yargs').argv
var clc = require('cli-color')
var deepSort = require('deep-sort')
var agility = require('@agility/content-fetch')

//colors... oh ya...
var error = clc.red.bold;
var warn = clc.yellow;
var notice = clc.blue;

//validate required args
if(!argv.stackpath_client_id) {
    console.error(error('Missing --stackpath_client_id argument. This is your Stackpath client ID for the API.'));
    return;
}

if(argv.stackpath_client_secret === undefined) {
    console.error(error('Missing --stackpath_client_secret argument. This is your Stackpath cilent secret for the API.'));
    return;
}

if(argv.stackpath_stack_id === undefined) {
    console.error(error('Missing --stackpath_stack_id argument. This is the stackpath stack to use.'));
    return;
}

if(argv.stackpath_site_id === undefined) {
    console.error(error('Missing --stackpath_site_id argument. This is the stackpath site ID to sync redirects with.'));
    return;
}

if(argv.agilitycms_guid === undefined) {
    console.error(error('Missing --agilitycms_guid argument. This is the guid of your agilitycms instance.'))
    return;
}

if(argv.agilitycms_fetchApiKey === undefined) {
    console.error(error('Missing --agilitycms_fetchApiKey argument. This is the fetchApiKey of your agilitycms instance. This is required in order to pull redirects from Agility CMS.'))
    return;
}


//default options
var options = {
    stackpath_client_id: null,
    stackpath_client_secret: null,
    stackpath_stack_id: null,
    stackpath_site_id: null,
    agilitycms_guid: null,
    agilitycms_fetchApiKey: null
}

//overwrite defaults
options = {...options, ...argv};

var getAuthToken = function(cb) {
    request({
        method: 'POST',
        uri: `https://gateway.stackpath.com/identity/v1/oauth2/token`,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: {
            grant_type: 'client_credentials',
            client_id: options.stackpath_client_id,
            client_secret: options.stackpath_client_secret
        },
        json: true,
    }, function(errorObj, response, body) {
        if(errorObj) {
            console.log(error(errorObj));
            return;
        } 
        if(response && response.statusCode) {
            console.log(notice('Successfully received auth token from Stackpath...'))
            cb(body.access_token);
        }
    });
}



var getMetrics = function(processMetrics) {
    getAuthToken(function(access_token) {
        //make the request to get metrics
        console.log(notice('Getting metrics from Stackpath...'))
        request({
            method: 'GET',
            uri: `https://gateway.stackpath.com/delivery/v1/stacks/${options.stack_id}/metrics?metric_type=TRANSFER&granularity=P1M&platforms=CDE&group_by=SITE&start_date=${options.start_date}&end_date=${options.end_date}`,
            body: null,
            json: true,
            auth: {
                bearer: access_token
            }
        }, function(errorObj, response, body) {
            if(errorObj) {
                console.error(error(errorObj));
                return;
            } 
            if(response.statusCode === 400) {
                console.error("400 error");
                return;
            }
            if(response && response.statusCode) {
                console.log(response.statusCode);
                console.log(notice('Got results from Stackpath, formatting...'))
                processMetrics(body);
            }
        });
    })
    
}

//GO!

//Get all Redirections from Agility CMS

const AGILITYMANAGED_CODE = 'ACMS - '
let agilityRedirections = {};
let stackpathRedirections = {};

const api = agility.getApi({
    guid: options.agilitycms_guid,
    apiKey: options.agilitycms_fetchApiKey,
});

let dateObj = null;

api.getUrlRedirections({
    lastAccessDate: dateObj
})
.then(function(resp) {
    agilityRedirections = Object.assign({}, ...resp.items.map((x) => ({[x.originUrl]: x})));
    console.log(agilityRedirections);
    getStackpathRedirects(function(resp) {
        console.log(resp);
        //createRedirect(agilityRedirections['~/some-test-origin']);
        //deleteRedirect(`284b647b-7006-4809-8213-174ae25b179d`);
    })
})
.catch(function(error) {
    console.log(error);
});


//Get all Redirections from Stackpath
var getStackpathRedirects = function(callback) {
    getStackpathScope(function(access_token, scope_id) {
        request({
            method: 'GET',
            uri: `https://gateway.stackpath.com/cdn/v1/stacks/${options.stackpath_stack_id}/sites/${options.stackpath_site_id}/scopes/${scope_id}/rules`,
            body: null,
            json: true,
            auth: {
                bearer: access_token
            }
        }, function(errorObj, response, body) {
            if(errorObj) {
                console.error(error(errorObj));
                return;
            } 
            if(response.statusCode === 400) {
                console.error("400 error");
                return;
            }
            if(response && response.statusCode) {
                console.log(response.statusCode);
                console.log(notice('Got redirects!'))
                callback(body);
            }
        });
    })
}

var getStackpathScope = function(callback) {
    getAuthToken(function(access_token) {
        
        request({
            method: 'GET',
            uri: `https://gateway.stackpath.com/cdn/v1/stacks/${options.stackpath_stack_id}/sites/${options.stackpath_site_id}/scopes`,
            body: null,
            json: true,
            auth: {
                bearer: access_token
            }
        }, function(errorObj, response, body) {
            if(errorObj) {
                console.error(error(errorObj));
                return;
            } 
            if(response.statusCode === 400) {
                console.error("400 error");
                return;
            }
            if(response && response.statusCode) {
                console.log(response.statusCode);
                console.log(notice('Got Scope!'))
                callback(access_token, body.results[0].id);
            }
        });
    })
}
//Loop through Agility CMS redirections and make a list of ones to create and ones to delete from Stackpath
var computeUpdatesToMake = function() {

}
//Do the work of deleting Stackpath redirects that are no longer in Agility CMS

//Do the work of creating new Stackpath redirects
var createRedirect = function(redirect, callback) {
    getStackpathScope(function(access_token, scope_id) {
        //make the request to get metrics
        console.log(notice('Creating redirects in Stackpath...', redirect))

        let urlPattern = formatUrl(redirect.originUrl);
        let urlRewrite = formatUrl(redirect.destinationUrl);


        request({
            method: 'POST',
            uri: `https://gateway.stackpath.com/cdn/v1/stacks/${options.stackpath_stack_id}/sites/${options.stackpath_site_id}/scopes/${scope_id}/rules`,
            body: { 
                "configuration":{
                   "originRequestModification":[
                      {
                         "urlPattern":urlPattern,
                         "urlRewrite":urlRewrite,
                         "enabled":true,
                         //"pathFilter":"*"
                      }
                   ]
                },
                "name": `${AGILITYMANAGED_CODE}${redirect.id}`
            },
            json: true,
            auth: {
                bearer: access_token
            }
        }, function(errorObj, response, body) {
            if(errorObj) {
                console.error(error(errorObj));
                return;
            } 
            if(response.statusCode === 400) {
                console.error("400 error");
                return;
            }
            if(response && response.statusCode) {
                console.log(response.statusCode);
                console.log(notice('Created a redirect...'))
                console.log(body);
            }
        });
    })
}

var formatUrl = function(url) {
    if(url.indexOf('~/') === 0) {
        url = `*://*/${url.substring(2, url.length)}`
    } else if(url.indexOf('/') === 0) {
        url = `*://*/${url.substring(1, url.length)}`
    }

    return url;
}

var deleteRedirect = function(stackpath_rule_id) {
    getStackpathScope(function(access_token, scope_id) {
        //make the request to get metrics
        console.log(notice(`Deleting redirect ${stackpath_rule_id} in Stackpath...`))
        request({
            method: 'DELETE',
            uri: `https://gateway.stackpath.com/cdn/v1/stacks/${options.stackpath_stack_id}/sites/${options.stackpath_site_id}/scopes/${scope_id}/rules/${stackpath_rule_id}`,
            body: null,
            json: true,
            auth: {
                bearer: access_token
            }
        }, function(errorObj, response, body) {
            if(errorObj) {
                console.error(error(errorObj));
                return;
            } 
            if(response.statusCode === 400) {
                console.error("400 error");
                return;
            }
            if(response && response.statusCode) {
                console.log(response.statusCode);
                console.log(notice('Deleted a redirect...'))
                console.log(body);
            }
        });
    })
}
// //GO!
// getMetrics(function(response) {

//     var results = {
//         totalBandwidthMB: null,
//         totalSites: null,
//         sites: [],
//     }
   
    

//     for(var i in response.data.matrix.results) {
//         var thisResult = response.data.matrix.results[i];
//         if(thisResult.metric.__name__ === 'transfer_used_total_mb') {
//             var bandwidthForThisSite = (thisResult.values.length > 0 ? parseFloat(thisResult.values[0].value) : 0); //TODO: handle multiple value ouputs for a time range
//             results.sites.push({
//                  bandwidthMB: bandwidthForThisSite,
//                  site_id: thisResult.metric.site_id,
//                  url: `https://control.stackpath.com/stacks/${options.stack_id}/sites/${thisResult.metric.site_id}/overview`
//                 });
//             results.totalBandwidthMB += bandwidthForThisSite;
//             results.totalSites ++;
//         }
//     }

//     results.sites = results.sites.sort(function(a,b) {
//         if(a.bandwidthMB < b.bandwidthMB) return 1;
//         if(a.bandwidthMB > b.bandwidthMB) return -1;
//         return 0;
//     })

//     results.sites = results.sites.slice(0, options.take);


//     console.log(results);
// })



