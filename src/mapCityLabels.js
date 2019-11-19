viewer.camera.changed.addEventListener(() => {
    mapLabels.isRequestCheck = true;
});

viewer.camera.moveEnd.addEventListener(() => {
    if (mapLabels.isRequestCheck) {
        mapLabels.isRequestCheck = false;
        console.log("------ map is changed, try to load labels");
        mapLabels.load();
    }
});


const mapLabels = {
    isRequestCheck: false,
    isServerAvailable: true, /// does the webserver can accept a new request?
    serverRequestDelay: 1000, /// time to wait from each request to the webserver
    labels: [],
    load: function () {
        if (!mapLabels.isServerAvailable) {
            return;
        }

        if (!mapIsReady) {
            console.log("attempt to load cities is refused...");
            let waitForMap = setInterval(function (handle) {
                if (mapIsReady) {
                    console.log("2nd attempt to load cities is accepted!");
                    clearInterval(waitForMap);
                    loader();
                }
            }, 1000);
        } else {
            console.log("attempt to load cities is accepted");
            loader();
        }

        /// load cities
        function loader() {
            let radius = cameraProperties.range / 1500;
            /// if the radius is < 1km don't request
            if (radius <= 1) {
                console.log("camera too near to terrain, don't request cities");
                mapLabels.isServerAvailable = true;
                return;
            }

            mapLabels.isServerAvailable = false;

            /// get the coordinates in the center of the window
            let cartographic = Cesium.Cartographic.fromCartesian(getPointFromCamera());
            let longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
            let latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);


            logger.log("looking for cities at " + latitude + " - " + longitude + " around " + radius + " Km");

            /// load mayor cities
            let minPopulation = 50000;
            let font = 'bold 18px Roboto';
            let minDistance = 50000;
            let maxDistance = 800000;
            getDataFromWebServer(function () {

                /// load minor cities
                setTimeout(function () {
                    console.log('load minor cities')
                    minPopulation = 1000;
                    font = '14px Roboto';
                    minDistance = 30000;
                    maxDistance = 200000;
                    getDataFromWebServer(function () {
                        console.log("end of cities request");
                        mapLabels.resetServerAvailable();
                    })
                }, mapLabels.serverRequestDelay);
            });



            /// actually get data from https://rapidapi.com/wirefreethought/api/geodb-cities/details
            function getDataFromWebServer(callback) {
                let data = null;
                let xhr = new XMLHttpRequest();
                xhr.withCredentials = true;

                xhr.addEventListener("readystatechange", function () {
                    if (this.readyState === this.DONE) {
                        let allObj = JSON.parse(this.responseText);
                        let data = allObj.data;

                        /// handle the error from webserver
                        if (data === undefined) {
                            console.error("error loading labels from webserver");
                            mapLabels.resetServerAvailable();
                            return;
                        }
                        if (data.length === 0) {
                            console.log("no cities with " + minPopulation + " people in this area");
                        }

                        /// create labels of the cities
                        for (let i = 0; i < data.length; i++) {
                            let result = data[i];
                            if (result.type === "CITY") {

                                /// check if this city is already loaded
                                if (!mapLabels.labels.includes(result.city)) {

                                    console.log("new city: " + result.city);

                                    /// create map label
                                    viewer.entities.add({
                                        position: Cesium.Cartesian3.fromDegrees(result.longitude, result.latitude),
                                        label: {
                                            text: result.city,
                                            font: font,
                                            fillColor: Cesium.Color.WHITE,
                                            outlineColor: Cesium.Color.BLACK,
                                            outlineWidth: 2,
                                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                                            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                                            heightReference: Cesium.HeightReference.NONE,
                                            pixelOffset: new Cesium.Cartesian2(0, -5),
                                            translucencyByDistance: new Cesium.NearFarScalar(minDistance, 1.0,
                                                maxDistance, 0.0),
                                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                                        }
                                    });

                                    mapLabels.labels.push(result.city);
                                } else {
                                    console.log("refused city: " + result.city);
                                }
                            }
                        }
                        callback();
                    }
                });


                xhr.open("GET", "https://wft-geo-db.p.rapidapi.com/v1/geo/locations/%2B" + latitude + "%2B" +
                    longitude + "/nearbyCities?limit=10&languageCode=it&minPopulation=" + minPopulation + "&radius=" + radius);
                xhr.setRequestHeader("x-rapidapi-host", "wft-geo-db.p.rapidapi.com");
                xhr.setRequestHeader("x-rapidapi-key", "ce699b059emshab8963e751a141dp1fb327jsn457d60aff686");
                xhr.send(data);
            }
        }
    },
    resetServerAvailable: function () {
        /// reset server available
        setTimeout(function () {
            mapLabels.isServerAvailable = true;
        }, mapLabels.serverRequestDelay);
    }
};