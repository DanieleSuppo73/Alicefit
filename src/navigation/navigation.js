/// Return the Cartesian3 point that is the intersection
/// of a ray from the camera to the specified x and y canvas positions
/// and the 3d terrain
function getPointFromCamera(xCanvas = null, yCanvas = null) {
    const canvas = viewer.scene.canvas;
    if (xCanvas === null || yCanvas === null) {
        xCanvas = canvas.clientWidth / 2;
        yCanvas = canvas.clientHeight / 2;
    }
    const ray = viewer.camera.getPickRay(new Cesium.Cartesian2(
        Math.round(xCanvas), Math.round(yCanvas)
    ));

    const point = viewer.scene.globe.pick(ray, viewer.scene);
    return point;
}


function resetCamera() {
    if (timer != null) {
        clearInterval(timer);
        timer = null;
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        console.log('RESET CAMERA')
        return false;
    }
}


function fixCameraToReferenceFrame() {
    let position = getPointFromCamera();
    viewer.camera.lookAt(position,
        new Cesium.HeadingPitchRange(viewer.camera.heading, viewer.camera.pitch, cameraProperties.range));
}


var _trackedEntity;
var timer;
var camera = viewer.scene.camera;
var cameraProperties = {
    minHeight: 0.4, // in Km
    maxHeight: 35, // in Km
    zoomRate: 7,

    get height() { // in Km
        var cartographic = new Cesium.Cartographic();
        var ellipsoid = viewer.scene.mapProjection.ellipsoid;
        ellipsoid.cartesianToCartographic(camera.positionWC, cartographic);
        return (cartographic.height * 0.001).toFixed(1);
    },

    get range() { // in meters
        let p = getPointFromCamera();
        if (p === undefined) {
            p = new Cesium.Cartesian3(0, 0, 0);
            alert("MAP ERROR");
        }
        return Cesium.Cartesian3.distance(camera.positionWC, p);
    },
};


//:::::::::::::::::::::::::::::::::::::::::::::::::
//:::                                           :::
//:::           CAMERA CONTROLLERS              :::
//:::                                           :::
//:::::::::::::::::::::::::::::::::::::::::::::::::


$(document).ready(function () {

    /// Zoom IN the map
    $("#zoomIn").mousedown(function () {
        $(this).css('opacity', '1');
        resetCamera();
        _trackedEntity = viewer.trackedEntity;
        unlinkCameraFromEntity();


        setTimeout(function () {

            timer = setInterval(function () {
                let h = cameraProperties.height;
                if (h >= cameraProperties.minHeight) {
                    var zoom = Math.pow(h, 1.25) * cameraProperties.zoomRate;
                    camera.moveForward(zoom);
                }
            }, 10);
            return false;


        }, 100);

        // timer = setInterval(function () {
        //     let h = cameraProperties.height;
        //     if (h >= cameraProperties.minHeight) {
        //         var zoom = Math.pow(h, 1.25) * cameraProperties.zoomRate;
        //         camera.moveForward(zoom);
        //     }
        // }, 10);
        // return false;
    });
    $("#zoomIn").mouseup(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
        if (_trackedEntity) {
            flyAndLinkCameraToEntity();
            _trackedEntity = null;
        }
    });
    $("#zoomIn").mouseleave(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
    });



    /// Zoom OUT the map
    $("#zoomOut").mousedown(function () {
        $(this).css('opacity', '1');
        resetCamera();
        _trackedEntity = viewer.trackedEntity;
        unlinkCameraFromEntity();


        setTimeout(function () {

            timer = setInterval(function () {
                let h = cameraProperties.height;
                if (h <= cameraProperties.maxHeight) {
                    var zoom = Math.pow(h, 1.25) * cameraProperties.zoomRate;
                    camera.moveBackward(zoom);
                }
            }, 10);
            return false;


        }, 100);






        // timer = setInterval(function () {
        //     let h = cameraProperties.height;
        //     if (h <= cameraProperties.maxHeight) {
        //         var zoom = Math.pow(h, 1.25) * cameraProperties.zoomRate;
        //         camera.moveBackward(zoom);
        //     }
        // }, 10);
        // return false;
    });

    $("#zoomOut").mouseup(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
        if (_trackedEntity) {
            flyAndLinkCameraToEntity();
            _trackedEntity = null;
        }
    });
    $("#zoomOut").mouseleave(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
    });



    /// Turn LEFT the map
    $("#turnLeft").mousedown(function () {


        _trackedEntity = viewer.trackedEntity;
        unlinkCameraFromEntity();


        setTimeout(function () {

            resetCamera();
            const target = getPointFromCamera();
            timer = setInterval(function () {
                camera.rotate(target, 0.005);
            }, 10);
            return false;


        }, 100);



        $(this).css('opacity', '1');
        // resetCamera();
        // const target = getPointFromCamera();
        // timer = setInterval(function () {
        //     camera.rotate(target, 0.005);
        // }, 10);
        // return false;
    });
    $("#turnLeft").mouseup(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
        if (_trackedEntity) {
            flyAndLinkCameraToEntity();
            _trackedEntity = null;
        }

    });
    $("#turnLeft").mouseleave(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
    });



    /// Turn RIGHT the map
    $("#turnRight").mousedown(function () {

        _trackedEntity = viewer.trackedEntity;
        unlinkCameraFromEntity();
        setTimeout(function () {

            resetCamera();
            const target = getPointFromCamera();
            timer = setInterval(function () {
                camera.rotate(target, -0.005);
            }, 10);
            return false;


        }, 100);


        $(this).css('opacity', '1');
        // resetCamera();
        // const target = getPointFromCamera();
        // timer = setInterval(function () {
        //     camera.rotate(target, -0.005);
        // }, 10);
        // return false;
    });
    $("#turnRight").mouseup(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
        if (_trackedEntity) {
            flyAndLinkCameraToEntity();
            _trackedEntity = null;
        }
    });
    $("#turnRight").mouseleave(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
    });



    /// Turn UP the map
    $("#turnUp").mousedown(function () {
        $(this).css('opacity', '1');
        if (Math.abs(viewer.camera.pitch) < 0.98) {



            _trackedEntity = viewer.trackedEntity;
            unlinkCameraFromEntity();
            setTimeout(function () {

                // console.log('rotate UP')
                resetCamera();
                fixCameraToReferenceFrame();
                timer = setInterval(function () {
                    if (Math.abs(viewer.camera.pitch) < 0.98) {
                        viewer.camera.rotateDown(0.005);
                    }
                }, 40);


            }, 100);








            // // console.log('rotate UP')
            // resetCamera();
            // fixCameraToReferenceFrame();
            // timer = setInterval(function () {
            //     if (Math.abs(viewer.camera.pitch) < 0.98) {
            //         viewer.camera.rotateDown(0.005);
            //     }
            // }, 40);
        }
    });

    $("#turnUp").mouseup(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
        if (_trackedEntity) {
            flyAndLinkCameraToEntity();
            _trackedEntity = null;
        }
    });
    $("#turnUp").mouseleave(function () {
        resetCamera();
    });


    /// Turn DOWN the map
    $("#turnDown").mousedown(function () {
        $(this).css('opacity', '1');

        if (Math.abs(viewer.camera.pitch) > 0.1) {




            _trackedEntity = viewer.trackedEntity;
            unlinkCameraFromEntity();
            setTimeout(function () {

                resetCamera();
                fixCameraToReferenceFrame();
                timer = setInterval(function () {
                    if (Math.abs(viewer.camera.pitch) > 0.1) {
                        viewer.camera.rotateUp(0.005);
                    }
                }, 40);


            }, 100);







            // resetCamera();
            // fixCameraToReferenceFrame();
            // timer = setInterval(function () {
            //     if (Math.abs(viewer.camera.pitch) > 0.1) {
            //         viewer.camera.rotateUp(0.005);
            //     }
            // }, 40);
        }
    });
    $("#turnDown").mouseup(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
        if (_trackedEntity) {
            flyAndLinkCameraToEntity();
            _trackedEntity = null;
        }
    });
    $("#turnDown").mouseleave(function () {
        $(this).css('opacity', '0.7');
        resetCamera();
    });
});