const allowListEle = document.querySelector("#allows_list");
const blockListEle = document.querySelector("#block_list");
const exceptionListEle = document.querySelector("#exceptions_list");
const externalJSONEle = document.querySelector("#external_json");

var HttpClient = function() {
    this.get = function(aUrl, aCallback) {
        var anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function() { 
            if (anHttpRequest.readyState === 4 && anHttpRequest.status === 200)
                aCallback(anHttpRequest.responseText);
        };

        anHttpRequest.open( "GET", aUrl, true );            
        anHttpRequest.send( null );
    };
};

/*
 Store the currently selected settings using browser.storage.local.
 */
function updateSettings() {
    if (externalJSONEle.value !== "") {
        var getJSON = new HttpClient();
        var extJSON;
        getJSON.get(externalJSONEle.value,function(response) {
            extJSON = JSON.parse(response);
            allowListEle.value = extJSON.allow.join("\n");
            blockListEle.value = extJSON.block.join("\n");
            if (Object.keys(extJSON.exceptions).length > 0) {
                exceptionListEle.value = "";
                Object.keys(extJSON.exceptions).forEach(function (key) {
                    if (!extJSON.exceptions[key].hasOwnProperty(key)) {
                        exceptionListEle.value += key + ":" + extJSON.exceptions[key] + "\n";
                    }
                });
            }
            updateStorage();
        });
    } else {
        updateStorage();
    }   
}

/*
 Get current values in the fields and update the storage.
 */
function updateStorage() {
    var exceptionDomains = {};
    var allowDomains;
    var blockDomains;
    if (!allowListEle.value.includes("eg:")) {
        allowDomains = allowListEle.value.split("\n");
    } else {
        allowDomains = null;
    }
    if (!blockListEle.value.includes("eg:")) {
        blockDomains = blockListEle.value.split("\n");
    } else {
        blockDomains = null;
    }
    var exceptionSplit = exceptionListEle.value.split("\n");
    exceptionSplit.forEach(function (element) {
        var tsplit = element.split(":");
        if (tsplit.length > 1 && tsplit[0] !== "eg") {
            exceptionDomains[tsplit[0]] = tsplit[1].split(",");
        }
    });
    
    browser.storage.local.set({
        externalJSON: externalJSONEle.value,
        allowList: [
            allowDomains
        ],

        blockList: [
            blockDomains
        ],

        exceptionsList: {
            exceptionDomains
        }
    });
}

/*
 Update the options UI with the settings values retrieved from storage,
 or the default settings if the stored settings are empty.
 */
function updateUI(restoredSettings) {
    allowListEle.value = restoredSettings.allowList.toString().replace(/,/g,"\n") || "eg: *.google.com (this will ensure https and http get covered, else you can be specific. This option will cover subdomains as well.)";
    blockListEle.value = restoredSettings.blockList.toString().replace(/,/g,"\n") || "eg: *.google.com (this will ensure https and http get covered, else you can be specific. This option will cover subdomains as well.)";
    var exceptString = "";
    if (Object.keys(restoredSettings.exceptionsList).length > 0) {
        Object.keys(restoredSettings.exceptionsList).forEach(function(key){
            Object.keys(restoredSettings.exceptionsList[key]).forEach(function (pval) {
                if (!restoredSettings.exceptionsList.hasOwnProperty(pval)) {
                    exceptString += pval + ":" +restoredSettings.exceptionsList[key][pval]+"\n";
                } 
            });           
        });
    } else {
        exceptString = false;
    }
    exceptionListEle.value = exceptString || "eg: *.google.com:maps,images (this will ensure https and http get covered, else you can be specific. This option will cover subdomains as well.)";
    externalJSONEle.value = restoredSettings.externalJSON || "";
}

function onError(e) {
    console.error(e);
}

/*
 On opening the options page, fetch stored settings and update the UI with them.
 */
const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(updateUI, onError);

/*
 On blur, save the currently selected settings.
 */
allowListEle.addEventListener("blur", updateSettings);
blockListEle.addEventListener("blur", updateSettings);
exceptionListEle.addEventListener("blur", updateSettings);
externalJSONEle.addEventListener("blur", updateSettings);