// ==UserScript==
// @name         WME Fix UR Interface
// @namespace    https://greasyfork.org/en/users/668704-phuz
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @version      1.01
// @description  Fix the UR Interface
// @author       phuz
// @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @require      http://cdnjs.cloudflare.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_fetch
// @grant        GM_addStyle

/* global OpenLayers */
/* global W */
/* global WazeWrap */
/* global $ */
/* global I18n */
/* global _ */
/* global MutationObserver */

// ==/UserScript==


//Begin script function
(function () {
    'use strict';
    //Bootstrap
    window["text123"] = 123;
    function bootstrap(tries = 1) {
        if (W && W.loginManager && W.map && W.loginManager.user && W.model
            && W.model.states && W.model.states.getObjectArray().length && WazeWrap && WazeWrap.Ready) {
            if (!OpenLayers.Icon) {

            }
        } else if (tries < 1000) {
            setTimeout(function () { bootstrap(++tries); }, 200);
        }
    }

    bootstrap();

    function loadObserver() {
        console.log("here we go...");
        const element = document.getElementById("panel-container");
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const { target } = mutation;
                if (mutation.attributeName === 'class') {
                    let intervalID = setInterval(function () {
                        if (document.getElementsByClassName("comment-list")[0]) {
                            let commentList = document.getElementsByClassName("comment-list");
                            commentList[0].remove(); //style = "display: none;";
                            clearInterval(intervalID);
                            fixTheBox();
                            $('#panel-container .mapUpdateRequest .top-section .body .conversation .new-comment-form .send-button').on('click', () => { fixTheBox(); });
                        }
                    }, 50);
                }
            });
        });

        observer.observe(element, { subtree: true, childList: true, attributes: true });
    }
    setTimeout(function () {
        loadObserver();
    }, 2000);

    function fixTheBox() {
        let reports = document.getElementsByClassName("map-problem");
        for (i = 0; i < reports.length; i++) {
            if (reports[i].classList.contains("selected")) {
                let reportID = (reports[i].getAttribute("data-id"));
                var newDiv = document.createElement("div");
                newDiv.id = "phuzReportComments";
                if (document.getElementById("phuzReportComments")) {
                    document.getElementById("phuzReportComments").remove();
                }
                document.getElementsByClassName("conversation-view")[0].prepend(newDiv);
                GM_xmlhttpRequest({
                    method: "GET",
                    url: "https://www.waze.com/Descartes/app/MapProblems/UpdateRequests?ids=" + reportID,
                    onload: function (response) {
                        let result = JSON.parse(response.responseText);
                        let responder = [];
                        if (result.users.objects.length > 0) {
                            for (i = 0; i < result.users.objects.length; i++) {
                                responder.push({ id: result.users.objects[i].id, user: result.users.objects[i].userName, rank: result.users.objects[i].rank + 1 });
                            }
                        }
                        let divHTML = "";
                        let commentUser;
                        for (i = 0; i < result.updateRequestSessions.objects[0].comments.length; i++) {
                            if (result.updateRequestSessions.objects[0].comments[i].userID == -1) {
                                commentUser = "<font color=#26bae8>Reporter</font>";
                            } else {
                                for (j = 0; j < result.users.objects.length; j++) {
                                    if (result.updateRequestSessions.objects[0].comments[i].userID == result.users.objects[j].id) {
                                        commentUser = result.users.objects[j].userName + "(" + (result.users.objects[j].rank + 1) + ")";
                                    }
                                }
                            }
                            divHTML += "<table border=0 width=100% cellpadding=1 cellspacing=1>";
                            divHTML += "<tr><td><b>" + commentUser + "</b></td><td align=right style='font-size: 11px;'>" + moment(new Date(result.updateRequestSessions.objects[0].comments[i].createdOn)).format('lll') + "</td></tr>";
                            divHTML += "<tr><td colspan=2>" + result.updateRequestSessions.objects[0].comments[i].text + "</td></tr>";
                            divHTML += "<hr style='margin: 5px;'>";
                        }
                        divHTML += "</table>";
                        divHTML += "<hr style='margin: 5px;'>";
                        document.getElementById("phuzReportComments").innerHTML = divHTML;
                    }
                });
            }
        }
    }

})();