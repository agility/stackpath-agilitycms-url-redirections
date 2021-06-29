# Sync Agility URL Redirections to Stackpath CLI
This CLI tool will lookup all [URL Redirections from Agility CMS](https://manager.agilitycms.com/settings/urlredirections), build a node.js serverless script (in memory) to handle those redirects, and upload it to a specified Stackpath site which has [Serverless Scripting](https://www.stackpath.com/products/serverless-scripting) enabled.

# How to Run It
1. Clone this repository `git clone https://github.com/agility/stackpath-agilitycms-url-redirections`
2. Run `npm install`
3. Get the following information from Agility CMS and Stackpath
- **stackpath_client_id** -> The API client ID from Stackpath
- **stackpath_client_secret** -> The API client secret from Stackpath
- **stackpath_stack_id** -> The stack ID of the site in Stackpath
- **stackpath_site_id** -> The site ID of the site in Stackpath
- **stackpath_script_id** -> The ID of the existing serverless script to update (must be created manually before you run this CLI tool) 
- **agilitycms_guid** -> The guid of the Agility CMS instance that has the URL redirects defined
- **agilitycms_fetchApiKey** -> The API key to use to retrieve the URL redirections from Agility CMS
4. Run the script the with following parameters (replace the `xxxxxxxxxxxx` with your real values)
```
node cli.js --stackpath_client_id xxxxxxxxxxxxxxxxxxx --stackpath_client_secret xxxxxxxxxxxxxxxxxxx  --stackpath_stack_id xxxxxxxxxxxxxxxxxxx --stackpath_site_id xxxxxxxxxxxxxxxxxxx --stackpath_script_id xxxxxxxxxxxxxxxxxxx --agilitycms_guid xxxxxxxxxxxxxxxxxxx --agilitycms_fetchApiKey xxxxxxxxxxxxxxxxxxx
```

# Need Support?
Please open a GitHub Issue for this repository.

# License
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
