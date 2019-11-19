const videoPlayer = {
    isPlaying: false,
    isSeeking: false,
    duration: 0,
    time: -1,
    oldTime: -1,
    oldId: null,
    omniVirtIframe: null,
    onProgressChangedHandlers: [], /// handlers for video progress updated
    onSeekedHandlers: [], /// handlers for video has been seeked
    timeout: null,
    load: function (url) {
    
        /// get id
        let id = 'ado-' + url;

        /// get previuos ID and change ID...
        let iframeId = this.oldId ? this.oldId : 'videoPlayerIframe';
        this.omniVirtIframe = document.getElementById(iframeId);
        this.omniVirtIframe.id = id;

        this.oldId = id;
        this.isPlaying = false;

        document.getElementById(id).setAttribute("src",
            "//cdn.omnivirt.com/content/" + url + "?player=true&autoplay=false&referer=" + encodeURIComponent(
                window.location.href));
    },
    play: function () {
        OmniVirt.api.sendMessage('play', null, this.omniVirtIframe);
    },
    pause: function () {
        OmniVirt.api.sendMessage('pause', null, this.omniVirtIframe);
    }
};



OmniVirt.api.receiveMessage('duration', function (eventName, data, instance) {
    console.log('------ video duration: ' + data + ' ------');
    videoPlayer.duration = data;
});


OmniVirt.api.receiveMessage('started', function (eventName, data, instance) {
    // console.log('------ video is started ------')
});


OmniVirt.api.receiveMessage('paused', function (eventName, data, instance) {
    videoPlayer.isPlaying = false;
    // console.log('------ video is paused ------')
});


OmniVirt.api.receiveMessage('ended', function (eventName, data, instance) {
    videoPlayer.isPlaying = false;
    // console.log('------ video is ended ------')
});


OmniVirt.api.receiveMessage('seeked', function (eventName, data, instance) {
    videoPlayer.isSeeking = true;
    console.log('------ video is seeked ------')

    if (videoPlayer.timeout) clearTimeout(videoPlayer.timeout);

    /// wait 500ms before to flag bool as false
    videoPlayer.timeout = setTimeout(function(){
        videoPlayer.isSeeking = false;
        videoPlayer.timeout = null;
        for (let i in videoPlayer.onSeekedHandlers) {
            videoPlayer.onSeekedHandlers[i]();
        }
        console.log('------ video seeking ended ------')
    }, 500)
});


// OmniVirt.api.receiveMessage('buffered', function (eventName, data, instance) {
//     // videoPlayer.isPlaying = false;
//     console.log('------ video is buffered ------' + data)
// });


OmniVirt.api.receiveMessage('progress', function (eventName, data, instance) {
    videoPlayer.time = videoPlayer.duration * data;

    /// if the progress is updated...
    if (videoPlayer.time !== videoPlayer.oldTime && !videoPlayer.isSeeking) {
        videoPlayer.isPlaying = true;
        videoPlayer.oldTime = videoPlayer.time;

        /// call the handlers registered for video progress
        /// p.s. we use handlers instead of direct call to some function
        /// because we want to keep videoplayer
        /// separated from everything else, to be able to change it in the future
        for (let i in videoPlayer.onProgressChangedHandlers) {
            videoPlayer.onProgressChangedHandlers[i]();
        }

    } else {
        videoPlayer.isPlaying = false;
    }
});