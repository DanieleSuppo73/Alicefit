function loadFromUrl(url, callback) {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            callback(this);
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
}




function convertTimeCodeToSeconds(timeString, framerate) {
    const timeArray = timeString.split(":");
    const hours = parseInt(timeArray[0]) * 60 * 60;
    const minutes = parseInt(timeArray[1]) * 60;
    const seconds = parseInt(timeArray[2]);
    const frames = parseInt(timeArray[3]) * (1 / framerate);
    return hours + minutes + seconds + frames;
}




function flyAndLinkCameraToEntity() {
    /// create boundingsphere around billboard
    var billboardPos = TMP.position._value;
    var boundingSphere = new Cesium.BoundingSphere(billboardPos, 1000);

    let heading = viewer.scene.camera.heading;
    let pitch = viewer.scene.camera.pitch;
    viewer.trackedEntity = TMP;
    viewer.camera.flyToBoundingSphere(boundingSphere, {
        offset: new Cesium.HeadingPitchRange(heading, pitch, 1000),
    });
}




function unlinkCameraFromEntity(callback = null) {
    viewer.trackedEntity = null;
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    if (callback) callback();
}




const TMP = viewer.entities.add({
    position: new Cesium.Cartesian3(0, 0, 0),
    billboard: {
        show: false,
        image: 'images/billboard.svg',
        width: 16,
        height: 16,
        // verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        // heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        color: new Cesium.Color(1.0, 1.0, 1.0, 1.0),
    }
});


/// wait for markers finished to load
function waitForMarkersLoaded(callback) {
    if (videoMarkers.isLoading === true) {
        setTimeout(function () {
            waitForMarkersLoaded(callback)
        }, 100);
    } else {
        callback();
    }
}



const videoMarkers = {
    asset: null,
    markers: [],
    markerIndex: -1,
    elapsedTime: 0,
    isLoading: false,


    load: function (asset, callback = null) {

        /// if there's one (only one) previous asset that is loading the markers
        /// wait until it will finish (we are doing this just for Venezia that don't have GPX... :/)
        waitForMarkersLoaded(function () {

            /// reset
            if (lerp) clearInterval(lerp);
            TMP.billboard.show = false;
            videoMarkers.markers = [];
            videoMarkers.markerIndex = -1;
            videoMarkers.asset = asset;
            videoMarkers.isLoading = true,

                loadFromUrl('data/xml/' + asset.videoMarkers, function (xml) {
                    let i;
                    let xmlDoc = xml.responseXML;
                    let x = xmlDoc.getElementsByTagName("MARKER");

                    for (i = 0; i < x.length; i++) {

                        let marker = {};

                        let timecode = x[i].getElementsByTagName("VIDEO_TIMECODE")[0].childNodes[0].nodeValue;
                        marker.time = convertTimeCodeToSeconds(timecode, 25);

                        /// we use DATE only if we have one or more gpx files, with all waypoints and their dateTimes,
                        /// and we have extracted these dateTimes on the markers.xml of the video
                        if (x[i].getElementsByTagName("GPX_TIME").length !== 0) {
                            if (x[i].getElementsByTagName("GPX_TIME")[0].childNodes.length !== 0) {
                                let date = x[i].getElementsByTagName("GPX_TIME")[0].childNodes[0].nodeValue;
                                marker.date = new Date(Date.parse(date)).getTime();
                            }
                        }

                        /// optionally we gave a TITLE for each marker, to show somewhere
                        if (x[i].getElementsByTagName("TITLE").length !== 0) {
                            if (x[i].getElementsByTagName("TITLE")[0].childNodes.length !== 0) {
                                marker.title = x[i].getElementsByTagName("TITLE")[0].childNodes[0].nodeValue;
                            }
                        }

                        /// we use LONGITUDE and LATITUDE only if we don't have a gpx file, to have a 'fake' position
                        /// on the map for each marker
                        if (x[i].getElementsByTagName("LONGITUDE").length !== 0) {
                            if (x[i].getElementsByTagName("LONGITUDE")[0].childNodes.length !== 0) {
                                marker.longitude = x[i].getElementsByTagName("LONGITUDE")[0].childNodes[0].nodeValue;
                            }
                        }
                        if (x[i].getElementsByTagName("LATITUDE").length !== 0) {
                            if (x[i].getElementsByTagName("LATITUDE")[0].childNodes.length !== 0) {
                                marker.latitude = x[i].getElementsByTagName("LATITUDE")[0].childNodes[0].nodeValue;
                            }
                        }

                        videoMarkers.markers.push(marker);
                    }

                    if (callback) {
                        callback();
                    } else {
                        videoMarkers.isLoading = false;
                    }
                });
        })
    },


    /// create a boundingSphere from markers LONGITUDE / LATITUDE xml values
    /// (that's because we don't have a GPX associated to the asset)
    createBoundingSphereFromMarkers: function (callback) {

        main.boundingSphereToLoad++;

        /// Create the coordinates array from longitude/latitude 
        let coordinates = [];
        for (let i in this.markers) {
            coordinates.push(this.markers[i].longitude, this.markers[i].latitude); // push without elevation
        }

        /// get Cartesian3 positions from coordinates
        let cartesianPositions = Cesium.Cartesian3.fromDegreesArray(coordinates);

        /// create a boundingSphere from coordinates
        let boundingSphere = new Cesium.BoundingSphere.fromPoints(cartesianPositions);

        /// return the boundingSphere to the asset
        /// that called the Track loading
        callback(boundingSphere);

        this.isLoading = false;
    },


    check: function () {

        /// if there are no markers return
        if (videoMarkers.markers.length < 2) return;

        for (let i = 0; i < videoMarkers.markers.length; i++) {

            if (i < videoMarkers.markers.length - 1 && videoPlayer.time >= videoMarkers.markers[i].time &&
                videoPlayer.time < videoMarkers.markers[i + 1].time && videoMarkers.markerIndex !== i) {

                videoMarkers.markerIndex = i;
                videoMarkers.onNewMarkerReached(i);
                break;

            } else if (i === videoMarkers.markers.length - 1 && videoPlayer.time >= videoMarkers.markers[i].time &&
                videoMarkers.markerIndex !== i) {

                videoMarkers.markerIndex = i;
                videoMarkers.onNewMarkerReached();
                break;
            }
        }
    },

    onNewMarkerReached: function () {

        console.log('-- new marker detected: index ' + this.markerIndex);

        /// if the video asset has no subObjects it means that
        /// has not GPX, so we use only the Longitude/Latitude from
        /// marker.xml file
        if (videoMarkers.asset.subObj.length === 0) {
            showOnlyMarkerPosition();

        } else {
            /// get the track
            let markerDateTime = this.markers[this.markerIndex].date;
            getTrackFromDateTime()
                .then(function (foundTrack) {

                    /// get the gpx index
                    getGpxIndexFromPlayerTime(foundTrack, markerDateTime)
                        .then(function (foundIndex) {

                            /// if the index is not found there's an error,
                            /// so return
                            if (foundIndex === null) {
                                console.error("Error founding index!")
                                return;
                            }

                            TMP.billboard.image = 'images/billboard.svg';
                            TMP.billboard.width = 16;
                            TMP.billboard.height = 16;
                            TMP.billboard.show = true;


                            unlinkCameraFromEntity();

                            /// start to lerp the billboard position
                            lerpPoints(foundTrack, foundIndex)
                        });
                })
        }
    },
};



/// if the video asset has no subObjects it means that
/// has not GPX, so we use only the Longitude/Latitude from
/// marker.xml file
let showOnlyMarkerPosition = function () {
    console.log('showOnlyMarkerPosition');

    unlinkCameraFromEntity();

    let longitude = videoMarkers.markers[videoMarkers.markerIndex].longitude;
    let latitude = videoMarkers.markers[videoMarkers.markerIndex].latitude;

    let marker = {
        coordinates: []
    }
    marker.coordinates = [longitude, latitude];

    insertHeightInCoordinates(marker, (Obj) => {
        let height = Obj.coordinates[2];
        let markerPos = new Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
        TMP.position = markerPos;
        TMP.billboard.image = 'images/billboard_radar.svg';
        TMP.billboard.width = 96;
        TMP.billboard.height = 96,
            TMP.billboard.show = true;

        /// if it's unlinked fly and link camera
        if (cameraLinkToggle.isLinked && !viewer.trackedEntity) {
            flyAndLinkCameraToEntity();
        }
    })
}



let getTrackFromDateTime = function () {
    return new Promise(function (resolve) {
        let parentAsset = videoMarkers.asset;
        let markerDateTime = videoMarkers.markers[videoMarkers.markerIndex].date;
        let isFound = false;
        let foundTrack;

        let AAA = -1;

        /// find all 'track' assets nested into the parent asset
        getAssetRecursive(parentAsset, false, 'track', false, (result) => {

            /// if we have already found the track don't continue
            if (isFound) return;

            AAA++;

            for (let i = 0; i < result.track.times.length - 1; i++) {

                if (markerDateTime >= result.track.times[i] &&
                    markerDateTime < result.track.times[i + 1]) {
                    isFound = true;
                    foundTrack = result.track;
                    console.log('found track n.' + AAA);
                    break;
                }
            }

            /// if the track is found resolve the promise
            /// with the found track
            if (isFound) {
                resolve(foundTrack);
            }
        })
    });
};




let getGpxIndexFromPlayerTime = function (track) {
    return new Promise(function (resolve, reject) {
        let index;
        let isFound = false;
        let markerTimeCode = videoMarkers.markers[videoMarkers.markerIndex].time;
        let markerDateTime = videoMarkers.markers[videoMarkers.markerIndex].date;

        /// get the actual dateTime that we'll use to retrieve
        /// the right gpx index in the track
        let actualDateTime = markerDateTime + ((videoPlayer.time - markerTimeCode) * 1000);

        for (let i = 0; i < track.times.length - 1; i++) {
            if (actualDateTime >= track.times[i] && actualDateTime < track.times[i + 1]) {

                isFound = true;
                index = actualDateTime - track.times[i] <
                    track.times[i + 1] - actualDateTime ? i : i + 1;
                break;
            }
        }

        if (isFound) {
            console.log('>>>>>> FOUND GPX index n.' + index);
            resolve(index);
        } else {
            console.error('GPX index not found');
            reject(null);
        }
    });
};



let lerp = null;

function lerpPoints(track, initIndex) {

    /// stop the lerp when we call it from outside
    /// of this loop
    if (lerp) {
        clearInterval(lerp);
    }

    if (initIndex === track.times.length - 1) return;

    let initPos = track.cartesianPositions[initIndex];
    let endPos = track.cartesianPositions[initIndex + 1];
    let newPos = new Cesium.Cartesian3();
    let lerpTime = track.times[initIndex + 1] - track.times[initIndex];
    // console.log('waypoints deltaTime: ' + lerpTime)

    let debugInitTime = new Date().getTime();
    let initTime = 0;
    let sampleInterval = lerpTime / 50;
    let lerpValue = 0;
    lerp = setInterval(function () {

        if (videoPlayer.isPlaying) {

            initTime += sampleInterval;
            lerpValue += sampleInterval / lerpTime;

            if (initTime < lerpTime) {
                /// move the billboard
                Cesium.Cartesian3.lerp(initPos, endPos, lerpValue, newPos)
                TMP.position = newPos;

                /// if it's unlinked fly and link camera
                if (cameraLinkToggle.isLinked && !viewer.trackedEntity) {
                    flyAndLinkCameraToEntity();
                }

            } else {
                clearInterval(lerp);
                lerp = null;
                let debugEndTime = new Date().getTime();
                console.log('lerp in ' + ((debugEndTime - debugInitTime) / 1000) + " sec.");
                videoMarkers.elapsedTime += (debugEndTime - debugInitTime) / 1000;

                /// loop the lerp infinitely
                lerpPoints(track, initIndex + 1);
            }
        }
    }, sampleInterval)
}



/////////////////////////////////////////////////////////////////////////////////
/// add handlers for videoplayer progress event
/////////////////////////////////////////////////////////////////////////////////
videoPlayer.onProgressChangedHandlers.push(videoMarkers.check);



/////////////////////////////////////////////////////////////////////////////////
/// add handlers for videoplayer seeked event
/////////////////////////////////////////////////////////////////////////////////
videoPlayer.onSeekedHandlers.push(function () {
    /// reset marker index
    videoMarkers.markerIndex = -1
})