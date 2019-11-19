/// hide the console
// console.log = function(){};


$(document).ready(function () {
            var bttn = $('#menuButton');
            $(bttn).hover(
                function () {
                    toggleSvgButton(this, true);
                },
                function () {
                    toggleSvgButton(this, false);
                });

            $(bttn).click(function () {
                if (!$(this).data('clicked')) {
                    $(this).data('clicked', true);
                    toggleSvgButton(this, true);

                } else {
                    $(this).data('clicked', false);
                    toggleSvgButton(this, false);
                }
            });


            bttn = $('#main');
            $(bttn).hover(
                function () {
                    toggleSvgButton(this, true);
                },
                function () {
                    toggleSvgButton(this, false);
                });
        });



        function toggleSvgButton(bttn, value) {
            // logger.log('toggleSvgButton')
            if (value) {
                $(bttn).addClass("svg-icon-hover");
            } else {
                if (!$(bttn).data('clicked')) {
                    // logger.log('removeClass')
                    $(bttn).removeClass("svg-icon-hover");
                }
            }
        }



        function login() {
            alert('not allowed')
        }



        /////////////////////////////////////////
        ////// cameraLinkToggle
        /////////////////////////////////////////
        const cameraLinkToggle = {
            isLinked: true,
            setCamera: function (value = null) {
                if (!this.isLinked) {
                    this.isLinked = true;
                    $("#cameraLinkToggle").attr("src", "images/icon_linked.svg");
                    if (videoMarkers.isBillboarDefined) {
                        flyAndLinkCameraToEntity();
                    }
                } else {
                    this.isLinked = false;
                    $("#cameraLinkToggle").attr("src", "images/icon_unlinked.svg");
                    if (viewer.trackedEntity) {
                        unlinkCameraFromEntity();
                    }
                }
            }
        }





        /// show/hide the LIST on the left as a flex container
        /// or as a slide panel,
        /// depending on the screen resolution
        const minWidth = 1281;
        let slidePanelWidth = '20em';
        let isFlex = null;
        let isSlideOpen = false;

        if ($('header').width() >= minWidth) showListAsFlex();
        else showListAsSlide();

        $(window).resize(function () {
            if ($('header').width() >= minWidth) showListAsFlex();
            else showListAsSlide();


        });



        function showListAsFlex() {
            if (isFlex && isFlex !== null) return;

            if (isSlideOpen) {
                isSlideOpen = false;
            }

            isFlex = true;
            logger.log('showListAsFlex')
            $('#menuButton').hide();
            $('#list').removeClass('list-container_slide');
            $('#list').addClass('flexContainer');
            $("#list").detach().appendTo("#panel1");
            $("#list").width('100%');
            $('#panel1').show();

            let itemContainerWidth = $('#panel1').width();
            $('.list-item-style_container').width(itemContainerWidth);
        }

        function showListAsSlide() {
            if (!isFlex && isFlex !== null) return;
            isFlex = false;
            logger.log('showListAsSlide')
            $('#menuButton').show();
            $('#list').removeClass('flexContainer');
            $('#list').addClass('list-container_slide');
            $("#list").detach().appendTo("#page");
            $("#list").width('0');
            $('#panel1').hide();

            $('.list-item-style_container').width(slidePanelWidth);
        }



        /// called when click on the menu button on the header
        /// to open/close the slided list
        function onListButtonClick() {

            if (isFlex) return;

            if (!isSlideOpen) {
                openSlideList();
                showBlackPanel();

            } else {
                closeSlideList();
                hideBlackPanel();
            }
        }






        function showBlackPanel() {
            $('#blackPanel').animate({
                opacity: 0.8
            });
            $('#blackPanel').css('pointer-events', 'auto')
        }


        function hideBlackPanel() {
            $('#blackPanel').animate({
                opacity: 0
            });
            $('#blackPanel').css('pointer-events', 'none')
        }


        function openSlideList() {

            let toggleWidth = $('header').outerWidth() < 481 ?
                $('header').outerWidth() : '400px';
            logger.log(toggleWidth);

            $('div.list-item-style_container').width(toggleWidth);

            $('#list').animate({
                width: toggleWidth
            });
            isSlideOpen = true;
        }


        function closeSlideList() {
            let toggleWidth = 0;
            $('#list').animate({
                width: toggleWidth
            });
            isSlideOpen = false;

        }

        ///////////////////////////////////////
        /////////////// OPEN PANEL2 ///////////
        ///////////////////////////////////////
        var isExpanded = false;

        function showPanel2() {
            if (!isExpanded) {
                $("#panel2").addClass("expandedPanel");
                isExpanded = true;
            }
        }

        function closePanel2() {
            if (isExpanded) {
                $("#panel2").removeClass("expandedPanel");
                isExpanded = false;
            }
        }

        function togglePanel2() {
            if (!isExpanded) {
                $("#panel2").removeClass("expandedPanel");
                isExpanded = true;
            } else {
                $("#panel2").removeClass("expandedPanel");
                isExpanded = false;
            }
        }




        ///////////////////////////////////////////////////
        /// FLY TO HOME
        ///////////////////////////////////////////////////
        function flyToHome() {
            $('#main').data('clicked', true);
            toggleSvgButton('#main', true);

            closePanel2();

            let selectedAsset = main;
            onPickedAsset(selectedAsset);
        }




        ///////////////////////////////////////////////////
        /// WIDGET ON HOVER
        ///////////////////////////////////////////////////
        function onListWidgetHover(id) {
            $(id).addClass('list-item-selected')
            $(id).find('.list-poster-frame').addClass('list-poster-frame-selected');
        }



        ///////////////////////////////////////////////////
        /// WIDGET ON OUT
        ///////////////////////////////////////////////////
        function onListWidgetOut(id) {
            if (!$(id).data('selected')) {
                $(id).removeClass('list-item-selected')
                $(id).find('.list-poster-frame').removeClass('list-poster-frame-selected');
            }
        }


        ///////////////////////////////////////////////////
        /// WIDGET ON CLICK
        ///////////////////////////////////////////////////
        function onListWidgetClick(id) {

            /// get the clicked asset
            let selectedAsset = getAssetFromClick(id);
            onPickedAsset(selectedAsset);

            /// close the slide list if is open
            onListButtonClick();
        }


        function getAssetFromClick(id) {
            if (id === 'main') return main;
            for (let i in main.subObj) {
                if (id === main.subObj[i].id) {
                    return main.subObj[i];
                } else {
                    for (let ii in main.subObj[i].subObj) {
                        if (id === main.subObj[i].subObj[ii].id) {
                            return main.subObj[i].subObj[ii];
                        }
                    }
                }
            }
        }