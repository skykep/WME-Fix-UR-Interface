// ==UserScript==
// @name         WME Fix UR Interface
// @namespace    https://greasyfork.org/en/users/668704-phuz
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @version      1.04
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

(function () {
    'use strict';
    //Bootstrap
    function bootstrap(tries = 1) {
        if (W && W.loginManager && W.map && W.loginManager.user && W.model
            && W.model.states && W.model.states.getObjectArray().length && WazeWrap && WazeWrap.Ready) {
            setTimeout(function () {
                //loadObserver();
            }, 500);
        } else if (tries < 1000) {
            setTimeout(function () { bootstrap(++tries); }, 200);
        }
    }

    var reportID;
    var conversationLength;
    const timer = ms => new Promise(res => setTimeout(res, ms))

    //thanks to dBsooner for providing the proper CSS for saving vertical space with the action buttons
    function injectCss() {
        $('<style = type="text/css">'
            + '#panel-container .mapUpdateRequest.panel .problem-edit .actions .controls-container label[for|="state"] { height: 22px; width: 162px; line-height: 26px; margin-bottom: 6px; }'
            + '#panel-container .mapUpdateRequest.panel .problem-edit[data-state="open"] .actions .controls-container label[for="state-solved"]  { display: inline-block; }'
            + '#panel-container .mapUpdateRequest.panel .problem-edit[data-state="open"] .actions .controls-container label[for|="state-not-identified"] { display: inline-block; }'
            + '#panel-container .mapUpdateRequest.panel .problem-edit[data-state="solved"] .actions .controls-container label[for|="state-open"], '
            + '#panel-container .mapUpdateRequest.panel .problem-edit[data-state="not-identified"] .actions .controls-container label[for|="state-open"] { display: inline-block !important; }'
            + '#panel-container .mapUpdateRequest.panel .problem-edit[data-state="not-identified"] .actions .controls-container label[for|="state-not-identified"], '
            + '#panel-container .mapUpdateRequest.panel .problem-edit[data-state="not-identified"] .actions .controls-container label[for|="state-solved"] { display: none !important; }'
            + '</style>').appendTo('head');
    }

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
                            $('#panel-container .mapUpdateRequest .top-section .body .conversation .conversation-region .conversation-view .comment-list').hide();
                            $('#panel-container .mapUpdateRequest .actions .section .content .controls-container').css('text-align', 'center');
                            $('#panel-container .mapUpdateRequest .actions .section .content .controls-container label[for=state-solved]').css('width', '135px');
                            $('#panel-container .mapUpdateRequest .actions .section .content .controls-container label[for=state-solved]').css('margin', '2px');
                            $('#panel-container .mapUpdateRequest .actions .section .content .controls-container label[for=state-solved]').text("Solved");
                            $('#panel-container .mapUpdateRequest .actions .section .content .controls-container label[for=state-not-identified]').css('width', '135px');
                            $('#panel-container .mapUpdateRequest .actions .section .content .controls-container label[for=state-not-identified]').css('margin', '2px');
                            $('#panel-container .mapUpdateRequest .actions .section .content .controls-container label[for=state-not-identified]').text("Not Identified");
                            const shadowDOMstyle = document.createElement('style');
                            shadowDOMstyle.innerHTML = '.wz-button.md { height: 30px !important; width: 60px !important; padding: 0px 6px !important; }';
                            $('#panel-container .mapUpdateRequest .top-section .body .conversation .new-comment-form .send-button')[0].shadowRoot.appendChild(shadowDOMstyle.cloneNode(true));
                            $('#panel-container .mapUpdateRequest .top-section .body .conversation .new-comment-form .new-comment-follow').css('height', '34px');
                            $('#panel-container .mapUpdateRequest .top-section .body .conversation .new-comment-form .new-comment-follow').css('line-height', '34px');
                            $('wz-button.send-button').css('margin', '0px');
                            $('wz-button.send-button').css('padding', '2px');

                            clearInterval(intervalID);
                            injectCss();

                            if (!document.getElementById("phuzReportComments")) {
                                buildTheComments();
                                $('#panel-container .mapUpdateRequest .top-section .body .conversation .new-comment-form .send-button').on('click', () => { appendNewComment(); });
                            }

                        }
                    }, 50);
                }
            });
        });
        observer.observe(element, { subtree: true, childList: true, attributes: true });
    }

    function buildTheComments() {
        let reports = document.getElementsByClassName("map-problem");
        for (i = 0; i < reports.length; i++) {
            if (reports[i].classList.contains("selected")) {
                reportID = (reports[i].getAttribute("data-id"));
                var newDiv = document.createElement("div");
                newDiv.id = "phuzReportComments";
                if (document.getElementById("phuzReportComments")) {
                    //document.getElementById("phuzReportComments").remove();
                }
                $('#panel-container .mapUpdateRequest .top-section .body .conversation .conversation-region .conversation-view').prepend(newDiv);
                //document.getElementsByClassName("conversation-view")[0].prepend(newDiv);
                GM_xmlhttpRequest({
                    method: "GET",
                    url: "https://www.waze.com/Descartes/app/MapProblems/UpdateRequests?ids=" + reportID,
                    onload: function (response) {
                        let result = JSON.parse(response.responseText);
                        let divHTML = "<table id=tblURConversation border=0 width=100% cellpadding=1 cellspacing=2>";
                        let commentUser;
                        conversationLength = result.updateRequestSessions.objects[0].comments.length;
                        for (i = 0; i < conversationLength; i++) {
                            if (result.updateRequestSessions.objects[0].comments[i].userID == -1) {
                                commentUser = "<font color=#26bae8>Reporter</font>";
                            } else {
                                for (j = 0; j < result.users.objects.length; j++) {
                                    if (result.updateRequestSessions.objects[0].comments[i].userID == result.users.objects[j].id) {
                                        commentUser = result.users.objects[j].userName + "(" + (result.users.objects[j].rank + 1) + ")";
                                    }
                                }
                            }
                            divHTML += "<tr><td><b>" + commentUser + "</b></td><td align=right style='font-size: 11px;'>" + moment(new Date(result.updateRequestSessions.objects[0].comments[i].createdOn)).format('lll') + "</td></tr>";
                            divHTML += "<tr style='background: #FFFFFF;border: 1px double #E6E6E6;border-radius: 1ex; '><td colspan=2>" + result.updateRequestSessions.objects[0].comments[i].text + "</td></tr>";
                        }
                        divHTML += "</tbody></table>";
                        divHTML += "<hr style='margin: 5px;'>";
                        document.getElementById("phuzReportComments").innerHTML = divHTML;
                    }
                });
            }
        }
    }
    
    function appendNewComment() {
        let tblHTML = "";
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://www.waze.com/Descartes/app/MapProblems/UpdateRequests?ids=" + reportID,
            onload: async function (response) {
                let result = JSON.parse(response.responseText);
                let commentUser;
                let resultLength = result.updateRequestSessions.objects[0].comments.length;
                let lastCommentIndex = resultLength - 1;
                if (resultLength > conversationLength) {
                    if (result.updateRequestSessions.objects[0].comments[lastCommentIndex].userID == -1) {
                        commentUser = "<font color=#26bae8>Reporter</font>";
                    } else {
                        for (j = 0; j < result.users.objects.length; j++) {
                            if (result.updateRequestSessions.objects[0].comments[lastCommentIndex].userID == result.users.objects[j].id) {
                                commentUser = result.users.objects[j].userName + "(" + (result.users.objects[j].rank + 1) + ")";
                            }
                        }
                    }
                    tblHTML += "<tr><td><b>" + commentUser + "</b></td><td align=right style='font-size: 11px;'>" + moment(new Date(result.updateRequestSessions.objects[0].comments[lastCommentIndex].createdOn)).format('lll') + "</td></tr>";
                    tblHTML += "<tr style='background: #FFFFFF;border: 1px double #E6E6E6;border-radius: 1ex; '><td colspan=2>" + result.updateRequestSessions.objects[0].comments[lastCommentIndex].text + "</td></tr>";
                    $('#tblURConversation').append(tblHTML);
                    conversationLength = resultLength;
                } else {
                    await timer(50);
                    appendNewComment();
                }
            }
        });
    }

    bootstrap();
    loadObserver();
})();