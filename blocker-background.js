const storageData = browser.storage.local.get();
var localData;
var currURL;

function onError(e) {
  console.error(e);
}

/*
 * convert storage to local variable and if external JSON is defined update stored definitions.
 */
function storedSetup(value) {
    localData = value;
    if (localData.externalJSON !== "") {
        var getJSON = new HttpClient();
        var extJSON;
        getJSON.get(localData.externalJSON, function (response) {
            extJSON = JSON.parse(response);
            var allowListVal = extJSON.allow.join("\n");
            var blockListVal = extJSON.block.join("\n");
            if (Object.keys(extJSON.exceptions).length > 0) {
                var exceptionListVal = "";
                Object.keys(extJSON.exceptions).forEach(function (key) {
                    if (!extJSON.exceptions[key].hasOwnProperty(key)) {
                        exceptionListVal += key + ":" + extJSON.exceptions[key] + "\n";
                    }
                });
            }
            var exceptionDomains = {};
            var allowDomains;
            var blockDomains;
            if (!allowListVal.includes("eg:")) {
                allowDomains = allowListVal.split("\n");
            } else {
                allowDomains = null;
            }
            if (!blockListVal.includes("eg:")) {
                blockDomains = blockListVal.split("\n");
            } else {
                blockDomains = null;
            }
            var exceptionSplit = exceptionListVal.split("\n");
            exceptionSplit.forEach(function (element) {
                var tsplit = element.split(":");
                if (tsplit.length > 1 && tsplit[0] !== "eg") {
                    exceptionDomains[tsplit[0]] = tsplit[1].split(",");
                }
            });

            browser.storage.local.set({
                externalJSON: localData.externalJSON,
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
            
            var tdata = browser.storage.local.get();
            tdata.then(function(value2) {localData = value2;},onError);
        });
    }
}

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

storageData.then(storedSetup, onError);

browser.webRequest.onBeforeRequest.addListener(checkLink,{urls: ["<all_urls>"], types: ["main_frame"]},["blocking"]);

/*
 * check current active link against allowed/block/exception settings
 */
function checkLink(details) {
    convertLocalData();
    currURL = details.url;
    if (localData.allowList[0] !== null) {
        console.log("allow list not empty");
        console.log(localData.allowList[0]);
        console.log(currURL);
        if (!localData.allowList[0].some(testlink)) {
            console.log("page not on allow list");
            if (testExceptions() !== 1) {
                browser.tabs.query({active: true, currentWindow: true}, function (tabs) {
                    browser.tabs.sendMessage(tabs[0].id, {greeting: "back"}).catch(onError);
                });
            }
        } else {
            console.log("page on allow list");
            console.log(localData.allowList[0]);
            if (testExceptions() === 1) {
                browser.tabs.query({active: true, currentWindow: true}, function (tabs) {
                    browser.tabs.sendMessage(tabs[0].id, {greeting: "back"}).catch(onError);
                });
            }
        }
    } else {
        if (localData.allowList[0] === null && localData.blockList[0].some(testlink)) {
            if (testExceptions() === 2 || testExceptions() === 0) {
                browser.tabs.query({active: true, currentWindow: true}, function (tabs) {
                    browser.tabs.sendMessage(tabs[0].id, {greeting: "back"}).catch(onError);
                });
            } 
        }
    } 
}

/*
 * searches exceptions and returns if an exception could be found or not.
 */
function testExceptions() {
    var linksplit = currURL.split("/",3);
    console.log(linksplit);
    var domain = "*."+linksplit[2].replace("www.","");
    console.log(domain);
    var fullyQualifiedDomain = linksplit[0]+"//"+linksplit[2];
    console.log(fullyQualifiedDomain);
    var exceptionDomains = Object.keys(localData.exceptionsList.exceptionDomains);
    var matchdomain = exceptionDomains.filter(s => s.includes(domain));
    console.log(matchdomain);
    var matchFQD = exceptionDomains.filter(s => s.includes(fullyQualifiedDomain));
    console.log(matchFQD);
    var usableDomain;
    if (matchdomain.length > 0) {
        usableDomain = matchdomain[0];
    } else if (matchFQD.length > 0) {
        usableDomain = matchFQD[0];
    }
    if (typeof usableDomain !== 'undefined') {
        if (localData.exceptionsList.exceptionDomains[usableDomain].some(testlink)) {
            console.log("returning 1");
            return 1;
        } else {
            console.log("returning 2");
            return 2;
        }
    } else {
        console.log("returning 0");
        return 0;
    }
}

/*
 * helper function
 */
function testlink(element) {
    return currURL.includes(element);
}

/*
 * converts local storage data to a more usable format for indexing and validation.
 */
function convertLocalData() {
    localData.blockList.forEach(function(innerArray) {
        if (innerArray !== null) {
            innerArray.forEach(function (value) {
                innerArray[innerArray.indexOf(value)] = value.replace("*.", "");
            });
        }
        localData.blockList[0] = innerArray;
    });
    localData.allowList.forEach(function(innerArray) {
        if (innerArray !== null) {
            innerArray.forEach(function (value) {
                innerArray[innerArray.indexOf(value)] = value.replace("*.", "");
            });
        }
        localData.allowList[0] = innerArray;
    });
}