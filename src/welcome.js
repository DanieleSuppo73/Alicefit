
const mapLoader = {
    minProgress: 10, /// change only this for min requested tiles
    maxProgress: 0,
    isProgressing: false,

    onProgress: (valProgress) => {
        if (!mapIsReady) {
            if (!mapLoader.isProgressing) {
                /// flag as started to download tiles
                if (valProgress >= mapLoader.minProgress) {
                    mapLoader.isProgressing = true;
                    mapLoader.maxProgress = valProgress;
                }
            }
            /// get the progress in percentage
            if (mapLoader.isProgressing) {
                let mapLoadingPercent = (100 - (valProgress / mapLoader.maxProgress * 100)).toFixed(0);
                // console.log('map loading : ' + mapLoadingPercent + '%');
                $("#mapLoaderIndicator").text(mapLoadingPercent + '%');
            }
        }
        else{
            mapLoader.hideLoader();
        }
    },

    showLoader: () => {
        $("#welcomePanel").css('display', 'block');
    },

    hideLoader: () => {
        $("#welcomePanel").fadeOut();
    },
}


/// register the handler to catch the tile loading progress
viewer.scene.globe.tileLoadProgressEvent.addEventListener((valProgress) => {
    mapLoader.onProgress(valProgress);
});


/// initialize with the map loader visible
$(document).ready(mapLoader.showLoader());