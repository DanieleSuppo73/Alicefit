/// Make a HttpRequest to load the GPX file
function gpxRequest(Obj, callback = null) {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            if (callback) callback(Obj, this);
        }
    };
    xhttp.open("GET", 'data/gpx/' + Obj.url, true);
    xhttp.send();
}


const lineMaterial = new Cesium.PolylineOutlineMaterialProperty({
    color: Cesium.Color.WHITE,
});

/// Track Class to store all the track informations and methods
/// inside the object
class Track {
    constructor(Obj) {
        this.callback = null;
        this.url = Obj.gpxUrl;
        this.coordinates = [];
        this.cartesianPositions = [];
        this.times = [];
        this.gpx = new gpxParser();
        this.duration = 0;
        this.distance = 0;
        this.difficulty = 0;
        this.averageSpeed = 0;
        this.placeholder = null;
        this.visibleTrack = null;
        this.boundingSphere = null;
        // this.defaultMaterial = new Cesium.PolylineOutlineMaterialProperty({
        //     color: new Cesium.Color(0.0,0.75,1.0,0.5),
        //     outlineWidth: 2,
        //     outlineColor: new Cesium.Color(0.0,0.0,0.0,0.5),
        // });
        this.defaultMaterial = new Cesium.PolylineOutlineMaterialProperty({
            color: new Cesium.Color(0.0, 0.75, 1.0, 0.0),
            outlineWidth: 2,
            outlineColor: new Cesium.Color(0.0, 0.0, 0.0, 0.0),
        });
        this.highlightedMaterial = new Cesium.PolylineOutlineMaterialProperty({
            color: Cesium.Color.ORANGE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK
        });
        // this.isVisibleAtStart = null;
    }


    /// load the GPX file
    load(callback) {

        // this.isVisibleAtStart = isTrackVisibleAtStart;
        this.callback = callback;
        main.boundingSphereToLoad++;

        gpxRequest(this, (Obj, xhttp) => {

            /// create a new GPX property for this object
            /// and parse it
            Obj.gpx.parse(xhttp.responseText);


            /// Add the coordinates from GPX file
            for (let i in Obj.gpx.waypoints) {
                if (i > 0) {
                    let pos1 = Cesium.Cartesian3.fromDegrees(Obj.gpx.waypoints[i].lon, Obj.gpx.waypoints[i].lat);
                    let pos2 = Cesium.Cartesian3.fromDegrees(Obj.gpx.waypoints[i - 1].lon, Obj.gpx.waypoints[i - 1].lat);
                    let dist = Cesium.Cartesian3.distance(pos1, pos2)

                    /// check if minimum waypoints distance is reached
                    if (dist > 5) {
                        Obj.coordinates.push(Obj.gpx.waypoints[i].lon, Obj.gpx.waypoints[i].lat); // push without elevation
                        Obj.times.push(new Date(Date.parse(Obj.gpx.waypoints[i].time)).getTime());
                    }
                } else {
                    Obj.coordinates.push(Obj.gpx.waypoints[i].lon, Obj.gpx.waypoints[i].lat); // push without elevation
                    Obj.times.push(new Date(Date.parse(Obj.gpx.waypoints[i].time)).getTime());
                }
            }



            /// add the height, sampled from the terrain
            insertHeightInCoordinates(Obj, () => {


                /// get Cartesian3 positions from coordinates
                Obj.cartesianPositions = Cesium.Cartesian3.fromDegreesArrayHeights(Obj.coordinates);

                /// create a boundingSphere from coordinates
                Obj.boundingSphere = new Cesium.BoundingSphere.fromPoints(Obj.cartesianPositions);


                /// draw the visible track
                Obj.drawTrack();


                /// return the boundingSphere to the asset
                /// that called the Track loading
                Obj.callback(Obj.boundingSphere);

            });
        });
    }



    getDetails(callback) {

        /// get distance
        for (let i = 0; i < this.cartesianPositions.length - 1; i++) {
            let from = this.cartesianPositions[i];
            let to = this.cartesianPositions[i + 1];
            this.distance += Cesium.Cartesian3.distance(from, to);
        }
        this.distance /= 1000; /// km


        /// get duration
        let initTime = this.times[0];
        let endTime = this.times[this.times.length - 1];
        this.duration = ((endTime - initTime) / 1000) / 60; /// minutes


        /// calculate other info
        this.difficulty = (this.duration / this.distance) * 15;
        this.averageSpeed = (this.distance / (this.duration / 60)).toFixed(0);


        // console.log('La distanza è: ' + this.distance + ' Km')
        // console.log('duration: ' + this.duration + ' minuti')
        // console.log('difficoltà: ' + this.difficulty + " %")

        
        let totDist = this.distance.toFixed(0);
        let totDuration = this.duration.toFixed(0);

        callback(totDist, totDuration, this.averageSpeed);
    }



    /// draw the track fro the 1st time,
    /// hidden!
    drawTrack() {
        this.visibleTrack = viewer.entities.add({
            polyline: {
                positions: this.cartesianPositions,
                clampToGround: false,
                width: 5,
                show: true,
                material: this.defaultMaterial,
                // distanceDisplayCondition: new Cesium.DistanceDisplayCondition(10.0, 25000), /// NOT WORKING ON MOBILE!
            }
        });



        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // let lon = this.gpx.waypoints[0].lon;
        // let lat = this.gpx.waypoints[0].lat;

        // let coord = [];
        // coord.push(lon, lat);

        // getCartographicWithHeightFromCoordinates(coord, (cartPos) => {
        //     // for (let i in cartPos){
        //     //     console.log(cartPos[i].height)
        //     // }

        //     let lineHeight = 1000;
        //     let coordForLine = [lon, lat, cartPos[0].height, lon, lat, cartPos[0].height + lineHeight];
        //     let linePos = Cesium.Cartesian3.fromDegreesArrayHeights(coordForLine);


        //     let lineMaterial = new Cesium.PolylineOutlineMaterialProperty({
        //         color: Cesium.Color.WHITE,
        //         outlineWidth: 2,
        //         outlineColor: new Cesium.Color(1, 1, 1, 0.5),
        //     });

        //     let line = viewer.entities.add({
        //         polyline: {
        //             positions: linePos,
        //             clampToGround: false,
        //             width: 1,
        //             show: true,
        //             material: lineMaterial,
        //         }
        //     });

        // });


    }
}