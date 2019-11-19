Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzZDU1NWMyOC00YjFkLTQ5OTUtODg5Yy0zZDRlNGI1NTg3ZjciLCJpZCI6MTUxNTgsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NjcyNDQ4NjR9.WDQmliwvLOArHiI9n4ET2TBELHRsGofW1unvSsbuyR8';
const terrainProvider = Cesium.createWorldTerrain();
const viewer = new Cesium.Viewer('CesiumContainer', {

    /// get imagery from Mapbox
    imageryProvider: new Cesium.MapboxImageryProvider({
        mapId: 'mapbox.satellite',
        accessToken: 'pk.eyJ1IjoiZGFuaWVsZXN1cHBvIiwiYSI6ImNqb2owbHp2YjAwODYzcW8xaWdhcGp1ancifQ.JvNWYw_cL6rV7ymuEbeTCw'
    }),

    terrainProvider: terrainProvider,
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    timeline: false,
    navigationHelpButton: false

});

/// enable occlusion culling
viewer.scene.globe.depthTestAgainstTerrain = true;


var scene = viewer.scene;
var mapCamera = scene.camera;

/// atmosphere color correction
scene.skyAtmosphere.brightnessShift = 0.3;
scene.skyAtmosphere.hueShift = 0.04;
scene.skyAtmosphere.saturationShift = -0.01;



viewer.scene.globe.maximumScreenSpaceError = 2; /// default is 2



const mapController = {
    onMapReayHandlers: [],
}



////////////////////////////////////////
/// wait for map ready
////////////////////////////////////////
var mapIsReady = false;
viewer.scene.globe.tileLoadProgressEvent.addEventListener((value) => {
    if (!mapIsReady && value === 0) {

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ////////// WHEN THE MAP IS READY
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        mapIsReady = true;
        console.log('mapIsReady')

        for (let i in mapController.onMapReayHandlers) {
            mapController.onMapReayHandlers[i]();
        }
    }
});




////////////////////////////////////////
/// fly the map to selected asset boundingSphere
////////////////////////////////////////
function flyToAll() {
    if (main.selectedAsset) {
        viewer.camera.flyToBoundingSphere(main.boundingSphere, {
            //offset: offset,
            // duration: 0,
        });
    }
}





////////////////////////////
/// return the Cartographic positions with height in meters
/// from an array of coodinates, with the elevation sampled from the terrain
////////////////////////////
function getCartographicWithHeightFromCoordinates(coord, callback) {
    let positions = [];
    for (let i = 0; i < coord.length; i += 2) {
        positions.push(Cesium.Cartographic.fromDegrees(coord[i], coord[i + 1]));
    }

    let promise = Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    Cesium.when(promise, function (updatedPositions) {
        // positions[0].height and positions[1].height have been updated.
        // updatedPositions is just a reference to positions.

        callback(positions);
    });
}




////////////////////////////
/// return the coordinates with the elevation sampled from the terrain
////////////////////////////
function insertHeightInCoordinates(Obj, callback) {
    let positions = [];
    for (let i = 0; i < Obj.coordinates.length; i += 2) {
        positions.push(Cesium.Cartographic.fromDegrees(Obj.coordinates[i], Obj.coordinates[i + 1]));
    }

    let promise = Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
    Cesium.when(promise, function (updatedPositions) {
        // positions[0].height and positions[1].height have been updated.
        // updatedPositions is just a reference to positions.

        /// add the height from cartesian to the array of log lat coordinates
        let i = 0;
        let ii = 0;
        while (i <= Obj.coordinates.length) {
            i += 2;
            if (ii == positions.length) {
                ii = positions.length - 1;
            }
            let metersToAddToHeight = 5;
            Obj.coordinates.splice(i, 0, positions[ii].height + metersToAddToHeight);
            i++;
            ii++;
        }

        /// remove last element (...?)
        Obj.coordinates.pop();

        /// callback
        callback(Obj);
    });
}




////////////////////////////////////////////////////////////
/// property to add to a placeholder
/// to change the visibility
////////////////////////////////////////////////////////////
function billboardImage(element) {

    this.setOpacity = function (value) {
        element.billboard.color = new Cesium.Color(1.0, 1.0, 1.0, value);
        // element.billboard.show = op === 1 ? true : false;
    };

    this.fadeInWithTimeout = function (time) {
        let Obj = this;
        setTimeout(function () {
            Obj.fadeIn();
        }, time)
    };

    this.fadeOutWithTimeout = function (time) {
        let Obj = this;
        setTimeout(function () {
            Obj.fadeOut();
        }, time)
    };

    this.fadeIn = function () {
        const fadeTime = 20;
        let op1 = 0.1;
        element.billboard.show = true;
        let timer2 = setInterval(function () {
            if (op1 >= 0.9) {
                clearInterval(timer2);
                element.billboard.color = new Cesium.Color(1.0, 1.0, 1.0, 1.0)
            }
            element.billboard.color = new Cesium.Color(1.0, 1.0, 1.0, op1);
            op1 += 0.025;
        }, fadeTime);
    };

    this.fadeOut = function () {
        const fadeTime = 20;
        let op2 = 1;
        let timer1 = setInterval(function () {
            if (op2 <= 0.1) {
                clearInterval(timer1);
                element.billboard.show = false;
            }
            element.billboard.color = new Cesium.Color(1.0, 1.0, 1.0, op2);
            op2 -= 0.025;
        }, fadeTime);
    };
}



////////////////////////////////////////////////////////////
/// property to add to a label
/// to change the visibility
////////////////////////////////////////////////////////////
function labelImage(element) {

    this.setOpacity = function (value) {
        // element.label.fillColor = new Cesium.Color(1.0, 1.0, 1.0, value);
        // element.label.backgroundColor = new Cesium.Color(0, 0, 0, value/2);
        element.style.opacity = value;
    };

    this.fadeInWithTimeout = function (time) {
        let Obj = this;
        setTimeout(function () {
            Obj.fadeIn();
        }, time)
    };

    this.fadeOutWithTimeout = function (time) {
        let Obj = this;
        setTimeout(function () {
            Obj.fadeOut();
        }, time)
    };

    this.fadeIn = function () {
        element.style.display = 'block';
        const fadeTime = 20;
        let op1 = 0.1;
        // element.label.show = true;
        let timer2 = setInterval(function () {
            if (op1 >= 0.9) {
                clearInterval(timer2);
                // element.label.fillColor = new Cesium.Color(1.0, 1.0, 1.0, 1.0)
                // element.label.backgroundColor = new Cesium.Color(0, 0, 0, 0.5);
                element.style.opacity = 1;
            }
            // element.label.fillColor = new Cesium.Color(1.0, 1.0, 1.0, op1);
            // element.label.backgroundColor = new Cesium.Color(0, 0, 0, op1/2);
            element.style.opacity = op1;
            op1 += 0.025;
        }, fadeTime);
    };

    this.fadeOut = function () {
        const fadeTime = 20;
        let op2 = 0.9;
        let timer1 = setInterval(function () {
            if (op2 <= 0.1) {
                clearInterval(timer1);
                // element.label.show = false;
                element.style.opacity = 0;
                element.style.display = 'none';
            }
            // element.label.fillColor = new Cesium.Color(1.0, 1.0, 1.0, op2);
            // element.label.backgroundColor = new Cesium.Color(0, 0, 0, op2/2);
            element.style.opacity = op2;
            op2 -= 0.025;
        }, fadeTime);
    }
}