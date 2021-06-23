#!/usr/bin/env nodes
var argv = require('yargs').argv;
var clc = require('cli-color');
var agility = require('@agility/content-fetch');
var buffer = require('buffer/').Buffer;
const fetch = require('node-fetch');

//colors... oh ya...
var error = clc.red.bold;
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

if(argv.stackpath_script_id === undefined) {
    console.error(error('Missing --stackpath_script_id argument. This is the stackpath script ID to update the serverless script.'));
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
    stackpath_script_id: null,
    agilitycms_guid: null,
    agilitycms_fetchApiKey: null
}

//overwrite defaults
options = {...options, ...argv};

//Get all Redirections from Agility CMS
let agilityRedirections = {};

const api = agility.getApi({
    guid: options.agilitycms_guid,
    apiKey: options.agilitycms_fetchApiKey,
});

let dateObj = null;

api.getUrlRedirections({
    lastAccessDate: dateObj
})
.then(async function(resp) {

    agilityRedirections = Object.assign({}, ...resp.items.map((u) => (
        formatUrlRedirects(u)
    )));

    var content = `

        addEventListener("fetch", event => {
            event.respondWith(handleRequest(event.request));
        });
        
        async function handleRequest(request) {
        
            try{
        
                const urlRedirects = ${
                    JSON.stringify(agilityRedirections)
                }
        
                const host = new URL(request.url).host;
                const path = new URL(request.url).pathname;
                const queryString = new URL(request.url).search;
                const fullURL = "https://"+ host + path + queryString;

                if(urlRedirects[fullURL]){
                    return new Response(null, {
                        status: urlRedirects[fullURL].statusCode,
                        statusText: "Moved Permanently",
                        headers: {
                            Location: urlRedirects[fullURL].destinationUrl
                        }
                    });      
                }
                else if(urlRedirects[path]){
                    return new Response(null, {
                        status: urlRedirects[path].statusCode,
                        statusText: "Moved Permanently",
                        headers: {
                            Location: urlRedirects[path].destinationUrl
                        }
                    });      
                }
                else{
                    return fetch(request);
                }        
            }
            catch(e){
                return fetch(request);
            }       
        }
    `;

    let code = buffer.from(content).toString('base64');    
    const authToken = await getAuthToken();
    await uploadServerlessScript(authToken,code);
})
.catch(function(ex) {
    error(ex);
});

async function uploadServerlessScript(authToken, code){

    const url = `https://gateway.stackpath.com/cdn/v1/stacks/${options.stackpath_stack_id}/sites/${options.stackpath_site_id}/scripts/${options.stackpath_script_id}`;
    const params = {
        method: 'PATCH',
        headers: {
            Accept: 'application/json', 'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`            
        },
        body: JSON.stringify({
            code
        })
    };

    try{
        let response = await fetch(url, params);
        let json = await response.json();
        console.log(notice(`Successfully uploaded ${json.script.name}!`));
    }
    catch(ex){
        console.log(error(ex));
    }
}

async function getAuthToken() {

    const url = 'https://gateway.stackpath.com/identity/v1/oauth2/token';
    const params = {
        method: 'POST',
        uri: `https://gateway.stackpath.com/identity/v1/oauth2/token`,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: options.stackpath_client_id,
            client_secret: options.stackpath_client_secret
        }),
    };

    try{
        let response = await fetch(url, params);
        let json = await response.json();
        return json.access_token;
    }
    catch(ex){
        console.log(error(ex));
        return "";
    }    
}

function formatUrlRedirects(urlRedirect){

    let parsedOriginUrl = urlRedirect.originUrl;
    let parsedDestinationUrl = urlRedirect.destinationUrl;

    if(parsedOriginUrl.charAt(0) == '~'){
        parsedOriginUrl = parsedOriginUrl.substring(1);
    }

    if(parsedDestinationUrl.charAt(0) == '~'){
        parsedDestinationUrl = parsedDestinationUrl.substring(1);
    }

    return { [parsedOriginUrl] : {destinationUrl: parsedDestinationUrl, statusCode: urlRedirect.statusCode}}
}