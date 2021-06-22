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

/*TODO:
- Write a sample redirect script in Stackpath 
- Get URL Redirections from Agility CMS in this app
- Normalize the redirects into a standard format that will
- Concatenate a string representing the new Script file that will be uploaded to stackpath
- Upload to stackpath, replacing the existing script (https://stackpath.dev/reference/serverless-scripting#updatesitescript)
*/



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


//Get all Redirections from Agility CMS

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

})
.catch(function(error) {
    console.log(error);
});



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
                callback(access_token, body.results[1].id);
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


