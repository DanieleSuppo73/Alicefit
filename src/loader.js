function loadDoc(Obj, callback) {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            callback(Obj, this);
        }
    };
    let url = main.url + Obj.id + '.xml';
    xhttp.open("GET", url, true);
    // logger.log("reading: " + url)
    xhttp.send();
}



// viewer.camera.changed.addEventListener(() => {
//     logger.log("MAP IS CHANGED!")
// });





//////
////// the Asset Class
class Asset {
    constructor(id) {
        this.id = id
        // this.type
        // this.owner
        // this.title
        // this.description = ""
        // this.date
        // this.url = ""
        this.locomotion = null;
        this.subObj = []
        this.isLoading = true;
        this.boundingSphere = null;
        this.parent = null;
        this.placeholder = null;
        this.isOver = false;
        this.isSelected = false;
        this.isOpen = false;
        this.label = null;
        this.gpxUrl = null;

        // this.placeholders = [];
        // this.activePlaceholder = 0;
        // this.handler;
    }

    setBoundingSphere(receivedBoundingSphere) {

        this.boundingSphere = this.boundingSphere === null ?
            receivedBoundingSphere :
            Cesium.BoundingSphere.union(this.boundingSphere, receivedBoundingSphere);

        this.parent.setBoundingSphere(this.boundingSphere);

        /// if this asset is a video draw placeholder
        if (this.type === 'event' || this.type === 'video') {
            this.drawPlaceholder();
            this.drawLabel();
        }
    }

    load(parentObj) {

        this.parent = parentObj;

        /// load object
        loadDoc(this, function (Obj, xml) {
            let xmlDoc = xml.responseXML;
            Obj.type = xmlDoc.getElementsByTagName("objType")[0].childNodes[0].nodeValue;
            Obj.owner = xmlDoc.getElementsByTagName("userName")[0].childNodes[0].nodeValue;
            Obj.title = xmlDoc.getElementsByTagName("title")[0].childNodes[0].nodeValue;

            if (xmlDoc.getElementsByTagName("description").length !== 0) {
                if (xmlDoc.getElementsByTagName("description")[0].childNodes.length !== 0) {
                    Obj.description = xmlDoc.getElementsByTagName("description")[0].childNodes[0].nodeValue;
                }
            }

            if (xmlDoc.getElementsByTagName("date").length !== 0) {
                if (xmlDoc.getElementsByTagName("date")[0].childNodes.length !== 0) {
                    Obj.date = new Date(Date.parse(xmlDoc.getElementsByTagName("date")[0].childNodes[0].nodeValue));
                }
            }

            if (xmlDoc.getElementsByTagName("gpxUrl").length !== 0) {
                if (xmlDoc.getElementsByTagName("gpxUrl")[0].childNodes.length !== 0) {
                    Obj.gpxUrl = xmlDoc.getElementsByTagName("gpxUrl")[0].childNodes[0].nodeValue;
                }
            }

            if (xmlDoc.getElementsByTagName("videoUrl").length !== 0) {
                if (xmlDoc.getElementsByTagName("videoUrl")[0].childNodes.length !== 0) {
                    Obj.videoUrl = xmlDoc.getElementsByTagName("videoUrl")[0].childNodes[0].nodeValue;
                }
            }

            if (xmlDoc.getElementsByTagName("location").length !== 0) {
                if (xmlDoc.getElementsByTagName("location")[0].childNodes.length !== 0) {
                    Obj.location = xmlDoc.getElementsByTagName("location")[0].childNodes[0].nodeValue;
                }
            }

            if (xmlDoc.getElementsByTagName("from").length !== 0) {
                if (xmlDoc.getElementsByTagName("from")[0].childNodes.length !== 0) {
                    Obj.from = new Date(Date.parse(xmlDoc.getElementsByTagName("from")[0].childNodes[0].nodeValue));
                }
            }

            if (xmlDoc.getElementsByTagName("to").length !== 0) {
                if (xmlDoc.getElementsByTagName("to")[0].childNodes.length !== 0) {
                    Obj.to = new Date(Date.parse(xmlDoc.getElementsByTagName("to")[0].childNodes[0].nodeValue));
                }
            }

            if (xmlDoc.getElementsByTagName("poster").length !== 0) {
                if (xmlDoc.getElementsByTagName("poster")[0].childNodes.length !== 0) {
                    Obj.poster = xmlDoc.getElementsByTagName("poster")[0].childNodes[0].nodeValue;
                }
            }

            if (xmlDoc.getElementsByTagName("videoMarkers").length !== 0) {
                if (xmlDoc.getElementsByTagName("videoMarkers")[0].childNodes.length !== 0) {
                    Obj.videoMarkers = xmlDoc.getElementsByTagName("videoMarkers")[0].childNodes[0].nodeValue;
                }
            }


            /// recursive load of sub objects
            if (xmlDoc.getElementsByTagName("id").length !== 0) {

                let subObjIds = xmlDoc.getElementsByTagName("id");
                for (let i = 0; i < subObjIds.length; i++) {

                    let subObjId = subObjIds[i].childNodes[0].nodeValue;

                    let thisIsTheParentObj = Obj;
                    Obj.subObj[i] = new Asset(subObjId);
                    Obj.subObj[i].load(thisIsTheParentObj);
                }
            }

            /// execute something after that the asset
            /// is loaded (and pass the parent Asset)
            Obj.onAssetLoadedHandler(parentObj);

            Obj.isLoading = false;
        })
    }


    /// function to execute when a specific
    /// asset is loaded
    onAssetLoadedHandler(parentObj) {

        if (this.type === "track") {

            if (this.gpxUrl !== null) {

                // /// if this asset parent is a video and parent of video is an event hide this track
                // let isTrackVisibleAtStart =
                //     // this.parent.type === 'video' && this.parent.parent.type === 'event' ? false : true;
                //     this.parent.type === 'video' && this.parent.parent.type === 'event' ? true : true;

                /// create a new Track object property for this asset
                this.track = new Track(this);
                this.track.load((returnedBoundingSphere) => {

                    /// get the boundingSphere from the
                    /// returned boundingSphere of the Track
                    this.boundingSphere = returnedBoundingSphere;

                    /// set the boundingSphere of the parent
                    parentObj.setBoundingSphere(this.boundingSphere);
                });
            }
        }

        if (this.type === 'video') {

            /// if there's not any track nested into this video create a boundingSphere
            /// from longitude/latitude from its marker.xml file
            if (this.subObj.length === 0) {

                console.log('bd from markers of: ' + this.title);

                let Obj = this;
                videoMarkers.load(this, function () {

                    videoMarkers.createBoundingSphereFromMarkers((returnedBoundingSphere) => {

                        /// set the boundingSphere of this video asset
                        Obj.setBoundingSphere(returnedBoundingSphere);
                    });
                })
            }
        }
    }


    drawPlaceholder() {
        if (this.placeholder === null) {
            console.log('create placeholder for: ' + this.title)
            this.placeholder = viewer.entities.add({
                position: this.boundingSphere.center,
                billboard: {
                    image: getIconByType(this.type),
                    width: 32,
                    height: 38,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    heightReference: Cesium.HeightReference.NONE,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    color: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
                }
            });
            /// add this asset to the placeholder for picking...
            this.placeholder.asset = this;

            /// add billboardImage property method for the placeholder
            this.placeholder.billboardImage = new billboardImage(this.placeholder);

            if (this.parent.type === 'event') {
                this.placeholder.billboardImage.setOpacity(0);
            }

            let Obj = this;

            /// register the handler for over placeholders
            this.onHoverHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            this.onHoverHandler.setInputAction(function (movement) {
                let pickedObject = scene.pick(movement.endPosition);
                if (Cesium.defined(pickedObject) && (pickedObject.id === Obj.placeholder)) {
                    onHoverPlaceholder(Obj);
                } else {
                    onExitPlaceholder(Obj);
                }
            }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);


        } else {
            this.placeholder.position = this.boundingSphere.center;
        }
    }

    drawLabel() {
        // if (this.label === null) {
        //     this.label = viewer.entities.add({
        //         position: this.boundingSphere.center,
        //         label: {
        //             text: this.title,
        //             font: '900 15px Roboto',
        //             disableDepthTestDistance: Number.POSITIVE_INFINITY,
        //             verticalOrigin: Cesium.VerticalOrigin.TOP,
        //             pixelOffset: new Cesium.Cartesian2(0, 10),
        //             backgroundColor: new Cesium.Color(0, 0, 0, 0.5),
        //             // translucencyByDistance : new Cesium.NearFarScalar(1.5e2, 1.0, 1.5e8, 0.0)
        //         }
        //     });
        //     this.label.label.showBackground = true;

        //     /// add labelImage property method for the placeholder
        //     this.label.labelImage = new labelImage(this.label);

        //     if (this.parent.type === 'event') {
        //         this.label.labelImage.setOpacity(0);
        //     }
        // } else {
        //     this.label.position = this.boundingSphere.center;
        // }

        if (this.label === null) {
            let Obj = this;
            let itm = document.getElementById('htmlOverlay');
            let cln = itm.cloneNode(true);
            cln.innerHTML = this.title;
            cln.style.display = 'block';
            document.getElementById("panel3").appendChild(cln);


            if (this.parent.type === 'event') {
                cln.style.opacity = 0;
                cln.style.pointerEvents = "none"
            }

            this.label = cln;

            /// add property to control fadeIn / fadeOut
            this.label.labelImage = new labelImage(this.label);

            /// register handler for click
            cln.asset = this;
            $(this.label).click(function () {
                onPickedAsset(cln.asset);
            })

            /// register the position on movement (actually each frame.... :/)
            let scratch = new Cesium.Cartesian2();
            viewer.scene.preRender.addEventListener(function () {
                let position = Obj.boundingSphere.center;
                let canvasPosition = viewer.scene.cartesianToCanvasCoordinates(position, scratch);
                if (Cesium.defined(canvasPosition)) {
                    Obj.label.style.top = canvasPosition.y + 'px';
                    Obj.label.style.left = (canvasPosition.x - 50) + 'px'; /// 100px is the total width of the label
                }
            });
        }
    }
}










main = {
    url: 'data/xml/',
    id: 'main',
    subObj: [],
    isLoaded: false,
    boundingSphere: null,
    boundingSphereToLoad: 0,
    boundingSphereLoaded: 0,
    selectedAsset: null,
    oldSelectedAsset: main,
    isReady: false,

    /// load the main.xml and all its children
    load: function () {
        if (!this.isLoaded) {
            loadDoc(this, function (Obj, xml) {
                let xmlDoc = xml.responseXML;
                let ids = xmlDoc.getElementsByTagName("id");

                for (let i = 0; i < ids.length; i++) {
                    let id = ids[i].childNodes[0].nodeValue;

                    const parentObj = Obj;
                    Obj.subObj[i] = new Asset(id);
                    Obj.subObj[i].load(parentObj);
                }

                /// wait for Asynchronous loading...
                setTimeout(function () {
                    let wait = setInterval(function () {

                        for (let i = 0; i < Obj.subObj.length; i++) {
                            if (Obj.subObj[i].isLoading) {
                                return;
                            }

                            if (Obj.subObj[i].subObj.length > 0) {
                                for (let ii = 0; ii < Obj.subObj[i].subObj.length; ii++) {
                                    if (Obj.subObj[i].subObj[ii].isLoading) {
                                        return;
                                    }
                                }
                            }
                        }

                        main.isLoaded = true;

                        clearInterval(wait);

                        /// sort by date
                        Obj.subObj = Obj.subObj.sort((a, b) => b.date - a.date);
                        logger.log("FINITO di caricare gli XML");
                        main.createList();

                    }, 500)
                }, 500)
            });

        }
    },


    /// create the list 
    /// called after all xml are loaded
    createList: function () {

        for (let i = 0; i < this.subObj.length; i++) {

            /// clone the container
            let newId = this.subObj[i].id + '_container';
            $('#list-item_container').clone().prop('id', newId).appendTo("#aaa");
            $('#' + newId).css({
                'display': 'block'
            });

            /// show the divisor
            if (this.subObj[i].type === "event") {
                logger.log("show event")
                $('#' + newId).find('#list-divisor-event').css({
                    'display': 'flex'
                });
            }
            if (this.subObj[i].type === "video") {
                logger.log("show video")
                $('#' + newId).find('#list-divisor-default').css({
                    'display': 'flex'
                });
            }



            /// create the item
            CreateDiv(this.subObj[i], newId);

            /// if any, create the sub-items
            if (this.subObj[i].subObj.length > 0) {

                for (let ii = 0; ii < this.subObj[i].subObj.length; ii++) {
                    CreateDiv(this.subObj[i].subObj[ii], newId);
                }
            }
        }
    },

    /// set the main boundingSphere
    /// sorrounding all assets
    setBoundingSphere(receivedBoundingSphere) {
        this.boundingSphere = this.boundingSphere === null ?
            receivedBoundingSphere :
            Cesium.BoundingSphere.union(this.boundingSphere, receivedBoundingSphere);


        this.boundingSphereLoaded++;

        if (this.boundingSphereLoaded === this.boundingSphereToLoad) {
            logger.log('ALL BOUNDING SPHERE LOADED')

            /// add more Km to the radius of the main boundingSphere
            this.boundingSphere.radius += 10000;
            this.onReadyHandler();
        }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////// WHEN EVERYTING IS LOADED...
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    onReadyHandler() {
        this.isReady = true;

        viewer.camera.flyToBoundingSphere(this.boundingSphere, {
            //offset: offset,
            duration: 0,
        });

        flyToHome();
    }
}



const CreateDiv = (obj, container) => {
    let div = GetDiv(obj.type);

    /// title
    $(div).find('.list-item-title').text(obj.title);

    /// description
    if (obj.description) {
        $(div).find('.list-item-description').text(obj.description);
    }

    /// poster image
    let folder = 'data/poster/'
    $(div).find('.list-item-poster').attr('src', folder + obj.poster);

    /// append new item
    $(div).clone().prop('id', obj.id).appendTo("#" + container);
    $('#' + obj.id).css({
        'display': 'block'
    });

    /// register handlers
    $('#' + obj.id).hover(function () {
        onListWidgetHover('#' + obj.id);
    }, function () {
        onListWidgetOut('#' + obj.id);
    });

}


const GetDivisor = kind => {
    if (kind === "event") return "#list-divisor-event";
    if (kind === "video") return "#list-divisor-default";
}


const GetDiv = kind => {
    if (kind === "event") return "#list-item_event";
    if (kind === "track") return null;
    if (kind === "video") return "#list-item_video";
    return null;
};


const GetIcon = kind => {
    if (kind === "event") return "images/event.svg";
    if (kind === "track") return "images/track.svg";
    if (kind === "video") return "images/video.svg";
    return null;
};



const getIconByType = (type, selected = false) => {
    if (!selected) {
        if (type === 'event') return 'images/icon_placeholder-event.svg';
        if (type === 'video') return 'images/icon_placeholder-video.svg';
        if (type === 'track') return 'images/icon_placeholder-track.svg';
        return null;
    }
    /// get from preloaded images
    else {
        let name;
        if (type === 'event') name = 'icon_placeholder-event_selected.svg'
        if (type === 'video') name = 'icon_placeholder-video_selected.svg'
        let index = preload.urls.indexOf(name);
        return preload.images[index];
    }
}



//////////////////
/// preload images
//////////////////
const preload = {
    folder: 'images/',
    urls: ['icon_placeholder-event_selected.svg',
        'icon_placeholder-video_selected.svg',
    ],
    images: [],
    load: function () {
        for (let i in this.urls) {
            let img = new Image();
            img.src = this.folder + this.urls[i];
            this.images.push(img)
        }
    }
}












/// register the handler for pick placeholders
viewer.screenSpaceEventHandler.setInputAction(function (movement) {
    let pickedFeature = viewer.scene.pick(movement.position);
    if (!Cesium.defined(pickedFeature)) {
        return;
    }
    let pickedPlaceholder = pickedFeature.id;
    if (pickedPlaceholder.asset) {
        onPickedAsset(pickedPlaceholder.asset);
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);













function SHOWALL() {
    console.log('SHOWALL');
    let selectedAsset = main;
    getNew(selectedAsset, true, 'track', false, (result) => {
        // result.track.visibleTrack.polyline.show = true;
        result.track.visibleTrack.polyline.material = result.track.highlightedMaterial;
        console.log('show track ' + result.track.url)
    });
}

function HIDEALL() {
    console.log('HIDEALL');
    let selectedAsset = main;
    getNew(selectedAsset, true, 'track', false, (result) => {
        // result.track.visibleTrack.polyline.show = false;
        result.track.visibleTrack.polyline.material = result.track.defaultMaterial;
        console.log('show track ' + result.track.url)
    });
}


function getNew(parent, includeParent, type, useOnlyParent, callback) {
    if (useOnlyParent) {
        console.log("MA PERCHE?")
        callback(parent);
        return;
    }
    if (includeParent && parent.type && parent.type === type)
        callback(parent);
    for (let i in parent.subObj) {
        if (type !== 'any') {
            if (parent.subObj[i].type === type) {
                callback(parent.subObj[i]);
            } else {
                getNew(parent.subObj[i], includeParent, type, useOnlyParent, callback);
            }
        } else {
            callback(parent.subObj[i]);
            getNew(parent.subObj[i], includeParent, type, useOnlyParent, callback);
        }
    }
}
















/////////////////////////////////////////////////////////////////////////////
/// function to execute when the mouse
/// is Hover a placeholder
/////////////////////////////////////////////////////////////////////////////
function onHoverPlaceholder(Obj) {
    if (!Obj.isSelected) {
        Obj.isOver = true;
        Obj.placeholder.billboard.scale = 1.3;

        /// if is a video set highlight material all nested tracks
        if (Obj.type === 'video') {
            getAssetRecursive(Obj, true, 'track', false, (result) => {
                result.track.visibleTrack.polyline.material = result.track.highlightedMaterial;
                // result.track.visibleTrack.polyline.show = true;
            });
        }

    }
}


/////////////////////////////////////////////////////////////////////////////
/// function to execute when the mouse
/// exit from a placeholder
/////////////////////////////////////////////////////////////////////////////
function onExitPlaceholder(Obj) {
    if (Obj.isOver && !Obj.isSelected && Obj.id !== 'main') {
        Obj.isOver = false;
        Obj.placeholder.billboard.scale = 1.0;

        /// if is a video set dafault material for all nested tracks
        if (Obj.type === 'video') {
            getAssetRecursive(Obj, true, 'track', false, (result) => {
                result.track.visibleTrack.polyline.material = result.track.defaultMaterial;
                // result.track.visibleTrack.polyline.show = false;
            });
        }
    }
}





/////////////////////////////////////////////////////////////////////////////
/// fade in/out placeholders recursively
/////////////////////////////////////////////////////////////////////////////
function fadePlaceholder(parent, type, value, timeout = null, useOnlyParent = false) {
    getAssetRecursive(parent, true, type, useOnlyParent, (result) => {
        if (value) {
            if (timeout) {
                result.placeholder.billboardImage.fadeInWithTimeout(timeout);
                result.label.labelImage.fadeInWithTimeout(timeout);
            } else {
                result.placeholder.billboardImage.fadeIn();
                // result.label.labelImage.fadeIn();
            }
        } else {
            if (timeout) {
                result.placeholder.billboardImage.fadeOutWithTimeout(timeout);
                result.label.labelImage.fadeOutWithTimeout(timeout);
            } else {
                result.placeholder.billboardImage.fadeOut();
                result.label.labelImage.fadeOut();
            }
        }
    })
}





/////////////////////////////////////////////////////////////////////////////
/// when  a video asset is clicked, from onPickedAsset function
/////////////////////////////////////////////////////////////////////////////
function onVideoAssetClicked(asset) {
    // console.log('CLICKED ON VIDEO')

    /// load the video
    videoPlayer.load(asset.videoUrl);


    /// load the markers and start to check
    if (asset.videoMarkers) {
        videoMarkers.load(asset);
    }

    /// show title and description in panel2
    $('#videoTitle').text(asset.title);
    if (asset.description) {
        $('#videoDescription').css('display', 'block');
        $('#videoDescription').text(asset.description);
    } else {
        $('#videoDescription').css('display', 'none');
    }

    /// show details in panel2
    let tracks = [];
    getAssetRecursive(asset, false, 'track', false, (result) => {
        tracks.push(result.track);
    });
    let totDistance = 0;
    let totDuration = 0;
    let totAverageSpeed = 0;
    for (let i in tracks) {
        tracks[i].getDetails(function (distance, duration, averageSpeed) {
            totDistance += parseInt(distance);
            totDuration += parseInt(duration);
            totAverageSpeed += parseInt(averageSpeed);
        });
    }
    totAverageSpeed = (totAverageSpeed / tracks.length).toFixed(0);

    $('#trackTotalDistance').text(totDistance);
    $('#trackTotalTime').text(totDuration);
    $('#trackAverageSpeed').text(totAverageSpeed);
}






/////////////////////////////////////////////////////////////////////////////
/// function to execute when something is picked
/// or clicked in the widget
/////////////////////////////////////////////////////////////////////////////
function onPickedAsset(asset) {


    let selectedAsset = asset;
    let oldSelectedAsset = main.oldSelectedAsset;


    /// if we are clicking on the same button
    if (selectedAsset === oldSelectedAsset) {
        return;
    }


    /// if we are tracking the billboard unlink and stop the video
    if (viewer.trackedEntity) {
        unlinkCameraFromEntity();
        videoPlayer.pause();
    }


    /// hide the billboard if selected asset is not a video
    if (selectedAsset !== 'video') {
        TMP.billboard.show = false;
    }



    /// if is a video call 'onVideoAssetClicked'
    if (selectedAsset.type === 'video') {
        onVideoAssetClicked(selectedAsset);
        viewer.camera.flyToBoundingSphere(selectedAsset.boundingSphere, {
            complete: function () {
                /// open the video panel
                showPanel2();
            }
        });
    } else {
        viewer.camera.flyToBoundingSphere(selectedAsset.boundingSphere);
    }



    /// turn on selected widget
    let selectedId = "#" + selectedAsset.id;
    $(selectedId).data('selected', true);
    onListWidgetHover(selectedId);


    /// turn off old widget
    if (oldSelectedAsset) {
        let oldId = "#" + oldSelectedAsset.id;
        $(oldId).data('selected', false);
        onListWidgetOut(oldId);


        /// turn off home button
        if (oldSelectedAsset === main) {
            $('#main').data('clicked', false);
            toggleSvgButton('#main', false);
        }
    }




    // /// fly to selected asset boundingSphere
    // viewer.camera.flyToBoundingSphere(selectedAsset.boundingSphere, {
    //     //offset: offset,
    //     // duration: 0,
    // });


    //////////////// TRACK AND PLACEHOLDER UI ////////////////
    //////////////// vvvvvvvvvvvvvvvvvvvvvvvv ////////////////


    /////////////////////////////// OLD SELECTED ///////////////////////////////////
    if (oldSelectedAsset && oldSelectedAsset.id !== 'main') {

        oldSelectedAsset.isSelected = false;
        /// restore default scale
        if (oldSelectedAsset.placeholder)
            oldSelectedAsset.placeholder.billboard.scale = 1;

        if (oldSelectedAsset.type === 'event') {
            if (selectedAsset.id !== 'main') {
                if (oldSelectedAsset.id !== selectedAsset.parent.id) {
                    /// restore old placeholder visibility
                    logger.log('restore old placeholder visibility')
                    oldSelectedAsset.placeholder.billboardImage.fadeInWithTimeout(1000);
                    oldSelectedAsset.label.labelImage.fadeIn();
                    // fade out old nested placeholders
                    logger.log('fade out old nested placeholders')
                    fadePlaceholder(oldSelectedAsset, 'video', false);
                }
            } else {
                /// restore old placeholder visibility
                logger.log('restore old placeholder visibility')
                oldSelectedAsset.placeholder.billboardImage.fadeInWithTimeout(1000);
                oldSelectedAsset.label.labelImage.fadeIn();
                // fade out old nested placeholders
                logger.log('fade out old nested placeholders')
                fadePlaceholder(oldSelectedAsset, 'video', false);
            }

        }

        if (oldSelectedAsset.parent.type === 'event') {
            if (selectedAsset.id !== 'main') {
                if (oldSelectedAsset.parent.id !== selectedAsset.parent.id &&
                    oldSelectedAsset.parent.id !== selectedAsset.id) {
                    /// restore old parent placeholder visibility
                    logger.log('restore old parent placeholder visibility: ' + oldSelectedAsset.parent.title)
                    oldSelectedAsset.parent.placeholder.billboardImage.fadeInWithTimeout(1000);
                    oldSelectedAsset.parent.label.labelImage.fadeIn();
                    /// fade out old parent nested placeholders
                    logger.log('fade out old parent nested placeholders')
                    fadePlaceholder(oldSelectedAsset.parent, 'video', false);
                }
            } else {
                /// restore old parent placeholder visibility
                logger.log('restore old parent placeholder visibility: ' + oldSelectedAsset.parent.title)
                oldSelectedAsset.parent.placeholder.billboardImage.fadeInWithTimeout(1000);
                oldSelectedAsset.parent.label.labelImage.fadeIn();
                /// fade out old parent nested placeholders
                logger.log('fade out old parent nested placeholders')
                fadePlaceholder(oldSelectedAsset.parent, 'video', false);
            }

        }

        if (oldSelectedAsset.type === 'video') {
            /// restore default old placeholder image
            oldSelectedAsset.placeholder.billboard.image =
                getIconByType(oldSelectedAsset.type, false);
            /// hide all nested tracks
            getAssetRecursive(oldSelectedAsset, true, 'track', false, (result) => {
                result.track.visibleTrack.polyline.material = result.track.defaultMaterial;
            })
            /// restore the label
            oldSelectedAsset.label.labelImage.setOpacity(1);
        }

    }



    /////////////////////////////// NEW SELECTED ///////////////////////////////////
    if (selectedAsset.id !== 'main') {

        selectedAsset.isSelected = true;
        /// set new scale
        selectedAsset.placeholder.billboard.scale = 1.3;

        if (selectedAsset.type === 'event') {
            if (oldSelectedAsset.id !== 'main') {
                if (oldSelectedAsset.parent.id !== selectedAsset.id) {
                    /// fade in nested placeholders
                    logger.log('fade in nested placeholders')
                    fadePlaceholder(selectedAsset, 'video', true, 1000);
                    /// fade out this placeholder
                    logger.log('fade out this placeholder')
                    selectedAsset.placeholder.billboardImage.fadeOut();
                    selectedAsset.label.labelImage.fadeOut();
                }
            } else {
                /// fade in nested placeholders
                logger.log('fade in nested placeholders')
                fadePlaceholder(selectedAsset, 'video', true, 1000);
                /// fade out this placeholder
                logger.log('fade out this placeholder')
                selectedAsset.placeholder.billboardImage.fadeOut();
                selectedAsset.label.labelImage.fadeOut();
            }

        }


        if (selectedAsset.type === 'video') {
            logger.log("VIDEO SELECTED: " + selectedAsset.title)
            /// change icon on selected
            // selectedAsset.placeholder.billboard.image =
            //     getIconByType(selectedAsset.type, true);
            selectedAsset.placeholder.billboard.image = null;

            /// show all nested tracks
            getAssetRecursive(selectedAsset, true, 'track', false, (result) => {
                result.track.visibleTrack.polyline.material = result.track.highlightedMaterial;
            })
            /// hide the label
            selectedAsset.label.labelImage.setOpacity(0);
            ///
            if (selectedAsset.parent.type === 'event') {
                if (oldSelectedAsset.id !== 'main') {
                    if (selectedAsset.parent.id !== oldSelectedAsset.parent.id &&
                        selectedAsset.parent.id !== oldSelectedAsset.id) {
                        /// fade in nested placeholders of the parent
                        logger.log('fade in nested placeholders of the parent')
                        fadePlaceholder(selectedAsset.parent, 'video', true, 1000);
                        /// fade out parent placeholder
                        logger.log('fade out parent placeholder')
                        selectedAsset.parent.placeholder.billboardImage.fadeOut();
                        selectedAsset.parent.label.labelImage.fadeOut();
                    }
                } else {
                    /// fade in nested placeholders of the parent
                    logger.log('fade in nested placeholders of the parent')
                    fadePlaceholder(selectedAsset.parent, 'video', true);
                    /// fade out parent placeholder
                    logger.log('fade out parent placeholder')
                    selectedAsset.parent.placeholder.billboardImage.fadeOut();
                    selectedAsset.parent.label.labelImage.fadeOut();
                }

            }
        }
    }




    main.selectedAsset = asset;
    main.oldSelectedAsset = selectedAsset;
    return;
}



/// get asset by 'type' nested
/// inside parent object
function getAssetRecursive(parent, includeParent, type, useOnlyParent, callback) {
    if (useOnlyParent) {
        console.log("MA PERCHE?")
        callback(parent);
        return;
    }
    if (includeParent && parent.type && parent.type === type)
        callback(parent);
    for (let i in parent.subObj) {
        if (type !== 'any') {
            if (parent.subObj[i].type === type) {
                callback(parent.subObj[i]);
            } else {
                getAssetRecursive(parent.subObj[i], includeParent, type, useOnlyParent, callback);
            }
        } else {
            callback(parent.subObj[i]);
            getAssetRecursive(parent.subObj[i], includeParent, type, useOnlyParent, callback);
        }
    }
}



////////////////////// //////////////////////////////////////////////
/// START - START - START - START - START - START - START - START ///
/////////////////////////////////////////////////////////////////////
function start() {

    preload.load();
    main.load();
}
start();