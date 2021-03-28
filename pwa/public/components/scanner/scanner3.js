import { getLazarSoftScanner } from './qrcode.js'

const CONSTANTS = {};
CONSTANTS.DEFAULT_WIDTH = 300;
CONSTANTS.DEFAULT_WIDTH_OFFSET = 2;
CONSTANTS.FILE_SCAN_MIN_HEIGHT = 300;
CONSTANTS.SCAN_DEFAULT_FPS = 2;
CONSTANTS.MIN_QR_BOX_SIZE = 50;
CONSTANTS.SHADED_LEFT = 1;
CONSTANTS.SHADED_RIGHT = 2;
CONSTANTS.SHADED_TOP = 3;
CONSTANTS.SHADED_BOTTOM = 4;
CONSTANTS.SHADED_REGION_CLASSNAME = "qr-shaded-region";
CONSTANTS.VERBOSE = false;
CONSTANTS.BORDER_SHADER_DEFAULT_COLOR = "#ffffff";
CONSTANTS.BORDER_SHADER_MATCH_COLOR = "rgb(90, 193, 56)";

/**
 * Initialize QR Code scanner.
 *
 * @param {String} elementId - Id of the HTML element.
 * @param {Boolean} verbose - Optional argument, if true, all logs
 *                  would be printed to console.
 */
export default (elementId, verbose) => {
    const instance = {};
    if (!getLazarSoftScanner) {
        throw 'Use Html5Qrcode.min.js without edit, getLazarSoftScanner'
        + 'not found.';
    }

    instance.qrcode = getLazarSoftScanner();
    if (!instance.qrcode) {
        throw 'qrcode is not defined, use the minified/html5-qrcode.min.js'
        + ' for proper support';
    }

    instance.elementId = elementId;
    instance.foreverScanTimeout = null;
    instance.localMediaStream = null;
    instance.shouldScan = true;
    
    instance.isScanning = false;

    instance.VERBOSE = verbose === true;
    instance.getCameras = methods.getCameras
    instance._getTimeoutFps = methods._getTimeoutFps
    instance._log = methods._log
    instance._logError = methods._logError

    // Looks like not used maybe API Break
    instance.url
        = window.URL || window.webkitURL || window.mozURL || window.msURL;
    instance.userMedia
        = navigator.getUserMedia || navigator.webkitGetUserMedia
        || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    
    

    const methods = {
        //#region static constants
        
        //#endregion
        /**
         * Start scanning QR Code for given camera.
         *
         * @param {String or Object} identifier of the camera, it can either be the
         *  cameraId retrieved from {@code Html5Qrcode#getCameras()} method or
         *  object with facingMode constraint.
         *  Example values:
         *      - "a76afe74e95e3aba9fc1b69c39b8701cde2d3e29aa73065c9cd89438627b3bde"
         *          ^ This is 'deviceId' from camera retrieved from
         *          {@code Html5Qrcode#getCameras()}
         *      - { facingMode: "user" }
         *      - { facingMode: "environment" }
         *      - { facingMode: { exact: "environment" } }
         *      - { facingMode: { exact: "user" } }
         *      - { deviceId: { exact: "a76afe74e95e3....73065c9cd89438627b3bde" }
         *      - { deviceId: "a76afe74e95e3....73065c9cd89438627b3bde" }
         *  Reference: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Syntax
         * @param {Object} config extra configurations to tune QR code scanner.
         *  Supported Fields:
         *      - fps: expected framerate of qr code scanning. example { fps: 2 }
         *          means the scanning would be done every 500 ms.
         *      - qrbox: width of QR scanning box, this should be smaller than
         *          the width and height of the box. This would make the scanner
         *          look like this:
         *          ----------------------
         *          |********************|
         *          |******,,,,,,,,,*****|      <--- shaded region
         *          |******|       |*****|      <--- non shaded region would be
         *          |******|       |*****|          used for QR code scanning.
         *          |******|_______|*****|
         *          |********************|
         *          |********************|
         *          ----------------------
         *      - aspectRatio: Optional, desired aspect ratio for the video feed.
         *          Ideal aspect ratios are 4:3 or 16:9. Passing very wrong aspect
         *          ratio could lead to video feed not showing up.
         *      - disableFlip: Optional, if {@code true} flipped QR Code won't be
         *          scanned. Only use this if you are sure the camera cannot give
         *          mirrored feed if you are facing performance constraints.
         *      - videoConstraints: {MediaTrackConstraints}, Optional
         *          @beta(this config is not well supported yet).
         *
         *          Important: When passed this will override other parameters
         *          like 'cameraIdOrConfig' or configurations like 'aspectRatio'.
         *
         *          videoConstraints should be of type {@code MediaTrackConstraints}
         *          as defined in
         *          https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
         *          and is used to specify a variety of video or camera controls
         *          like: aspectRatio, facingMode, frameRate, etc.
         * @param {Function} qrCodeSuccessCallback callback on QR Code found.
         *  Example:
         *      function(qrCodeMessage) {}
         * @param {Function} qrCodeErrorCallback callback on QR Code parse error.
         *  Example:
         *      function(errorMessage) {}
         *
         * @returns Promise for starting the scan. The Promise can fail if the user
         * doesn't grant permission or some API is not supported by the browser.
         */
        start(cameraIdOrConfig,
            configuration,
            qrCodeSuccessCallback,
            qrCodeErrorCallback) {
            if (!cameraIdOrConfig) {
                throw "cameraIdOrConfig is required";
            }
    
            if (!qrCodeSuccessCallback
                || typeof qrCodeSuccessCallback != "function") {
                throw "qrCodeSuccessCallback is required and should be a function."
            }
    
            if (!qrCodeErrorCallback) {
                qrCodeErrorCallback = console.log;
            }
    
            // Cleanup.
            methods._clearElement();
            
    
            // Create configuration by merging default and input settings.
            const config = Object.assign({ fps: CONSTANTS.SCAN_DEFAULT_FPS },configuration)
                
            // Check if videoConstraints is passed and valid
            let videoConstraintsAvailableAndValid = false;
            if (config.videoConstraints) {
                if (!methods._isMediaStreamConstraintsValid(config.videoConstraints)) {
                    methods._logError(
                        "'videoConstraints' is not valid 'MediaStreamConstraints, "
                            + "it will be ignored.'",
                        /* experimental= */ true);
                } else {
                    videoConstraintsAvailableAndValid = true;
                }
            }
            const videoConstraintsEnabled = videoConstraintsAvailableAndValid;
    
            // qr shaded box
            const isShadedBoxEnabled = config.qrbox != undefined;
            const element = document.getElementById(instance.elementId);
            const width = element.clientWidth
                ? element.clientWidth : CONSTANTS.DEFAULT_WIDTH;
            element.style.position = "relative";
    
            instance.shouldScan = true;
            methods._element = element;
            instance.qrcode.callback = qrCodeSuccessCallback;
    
            // Validate before insertion
            if (isShadedBoxEnabled) {
                const qrboxSize = config.qrbox;
                if (qrboxSize < CONSTANTS.MIN_QR_BOX_SIZE) {
                    throw "minimum size of 'config.qrbox' is"
                    + ` ${CONSTANTS.MIN_QR_BOX_SIZE}px.`;
                }
    
                if (qrboxSize > width) {
                    throw "'config.qrbox' should not be greater than the "
                    + "width of the HTML element.";
                }
            }
    
            //#region local methods
            /**
             * Setups the UI elements, changes the state of this class.
             *
             * @param width derived width of viewfinder.
             * @param height derived height of viewfinder.
             */
            const setupUi = (width, height) => {
                const qrboxSize = config.qrbox;
                if (qrboxSize > height) {
                    // TODO(mebjas): Migrate to common logging.
                    console.warn("[Html5Qrcode] config.qrboxsize is greater "
                        + "than video height. Shading will be ignored");
                }
    
                const shouldShadingBeApplied
                    = isShadedBoxEnabled && qrboxSize <= height;
                const defaultQrRegion = {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height
                };
                const qrRegion = shouldShadingBeApplied
                    ? methods._getShadedRegionBounds(width, height, qrboxSize)
                    : defaultQrRegion;
    
                const canvasElement = methods._createCanvasElement(
                    qrRegion.width, qrRegion.height);
                const context = canvasElement.getContext('2d');
                context.canvas.width = qrRegion.width;
                context.canvas.height = qrRegion.height;
    
                // Insert the canvas
                element.append(canvasElement);
                if (shouldShadingBeApplied) {
                    methods._possiblyInsertShadingElement(element, width, height, qrboxSize);
                }
    
                // Update local states
                instance._qrRegion = qrRegion;
                instance._context = context;
                instance._canvasElement = canvasElement;
            }
    
            /**
             * Scans current context using the qrcode library.
             *
             * <p>This method call would result in callback being triggered by the
             * qrcode library. This method also handles the border coloring.
             *
             * @returns true if scan match is found, false otherwise.
             */
            const scanContext = () => {
                try {
                    instance.qrcode.decode();
                    methods._possiblyUpdateShaders(/* qrMatch= */ true);
                    return true;
                } catch (exception) {
                    methods._possiblyUpdateShaders(/* qrMatch= */ false);
                    qrCodeErrorCallback(
                        `QR code parse error, error = ${exception}`);
                    return false;
                }
            }
    
            // Method that scans forever.
            const foreverScan = () => {
                if (!instance.shouldScan) {
                    // Stop scanning.
                    return;
                }
                if (instance.localMediaStream) {
    
                    // There is difference in size of rendered video and one that is
                    // considered by the canvas. Need to account for scaling factor.
                    const videoElement = instance._videoElement;
                    const widthRatio
                        = videoElement.videoWidth / videoElement.clientWidth;
                    const heightRatio
                        = videoElement.videoHeight / videoElement.clientHeight;
                    const sWidthOffset = instance._qrRegion.width * widthRatio;
                    const sHeightOffset = instance._qrRegion.height * heightRatio;
                    const sxOffset = instance._qrRegion.x * widthRatio;
                    const syOffset = instance._qrRegion.y * heightRatio;
    
                    // Only decode the relevant area, ignore the shaded area,
                    // More reference:
                    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
                    instance._context.drawImage(
                        instance._videoElement,
                        /* sx= */ sxOffset,
                        /* sy= */ syOffset,
                        /* sWidth= */ sWidthOffset,
                        /* sHeight= */ sHeightOffset,
                        /* dx= */ 0,
                        /* dy= */  0,
                        /* dWidth= */ instance._qrRegion.width,
                        /* dHeight= */ instance._qrRegion.height);
    
                        // Try scanning normal frame and in case of failure, scan
                        // the inverted context if not explictly disabled.
                        // TODO(mebjas): Move this logic to qrcode.js
                        if (!scanContext() && config.disableFlip !== true) {
                            // scan inverted context.
                            instance._context.translate(instance._context.canvas.width, 0);
                            instance._context.scale(-1, 1);
                            scanContext();
                        }
                }
                instance.foreverScanTimeout = setTimeout(
                    foreverScan, methods._getTimeoutFps(config.fps));
            }
    
            // success callback when user media (Camera) is attached.
            const onMediaStreamReceived = mediaStream => {
                return new Promise((resolve, reject) => {
                    const setupVideo = () => {
                        const videoElement = methods._createVideoElement(width);
                        instance._element.append(videoElement);
                        // Attach listeners to video.
                        videoElement.onabort = reject;
                        videoElement.onerror = reject;
                        videoElement.onplaying = () => {
                            const videoWidth = videoElement.clientWidth;
                            const videoHeight = videoElement.clientHeight;
                            setupUi(videoWidth, videoHeight);
    
                            // start scanning after video feed has started
                            foreverScan();
                            resolve();
                        }
    
                        videoElement.srcObject = mediaStream;
                        videoElement.play();
    
                        // Set state
                        instance._videoElement = videoElement;
                    }
    
                    instance.localMediaStream = mediaStream;
                    // If videoConstraints is passed, ignore all other configs.
                    if (videoConstraintsEnabled || !config.aspectRatio) {
                        setupVideo();
                    } else {
                        const constraints = {
                            aspectRatio : config.aspectRatio
                        }
                        const track = mediaStream.getVideoTracks()[0];
                        track.applyConstraints(constraints)
                            .then(_ => setupVideo())
                            .catch(error => {
                                // TODO(mebjas): Migrate to common logging.
                                console.log(
                                    "[Warning] [Html5Qrcode] Constriants could not "
                                        + "be satisfied, ignoring constraints",
                                    error);
                                setupVideo();
                            });
                    }
                });
            }
            //#endregion
    
            return new Promise((resolve, reject) => {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    // Ignore all other video constraints if the videoConstraints
                    // is passed.
                    const videoConstraints = videoConstraintsEnabled
                        ? config.videoConstraints
                        : instance._createVideoConstraints(cameraIdOrConfig);
                    navigator.mediaDevices.getUserMedia(
                        {
                            audio: false,
                            video: videoConstraints
                        }).then(stream => {
                            onMediaStreamReceived(stream)
                                .then(_ => {
                                    instance.isScanning = true;
                                    resolve();
                                })
                                .catch(reject);
                        })
                        .catch(err => {
                            reject(`Error getting userMedia, error = ${err}`);
                        });
                } else if (navigator.getUserMedia) {
                    if (typeof cameraIdOrConfig != "string") {
                        throw "The device doesn't support navigator.mediaDevices"
                            + ", only supported cameraIdOrConfig in this case is"
                            + " deviceId parameter (string)."
                    }
                    const getCameraConfig = {
                        video: {
                            optional: [{
                                sourceId: cameraIdOrConfig
                            }]
                        }
                    };
                    navigator.getUserMedia(getCameraConfig,
                        stream => {
                            onMediaStreamReceived(stream)
                                .then(_ => {
                                    instance.isScanning = true;
                                    resolve();
                                })
                                .catch(reject);
                        }, err => {
                            reject(`Error getting userMedia, error = ${err}`);
                        });
                } else {
                    reject("Web camera streaming not supported by the browser.");
                }
            });
        },
    
        /**
         * Stops streaming QR Code video and scanning.
         *
         * @returns Promise for safely closing the video stream.
         */
        stop() {
            // TODO(mebjas): fail fast if the start() wasn't called.
            instance.shouldScan = false;
            clearTimeout(instance.foreverScanTimeout);
    
            
            return new Promise((resolve, /* ignore */ reject) => {
                instance.qrcode.callback = null;
                const tracksToClose
                    = instance.localMediaStream.getVideoTracks().length;
                var tracksClosed = 0;
    
                // Removes the shaded region if exists.
                const removeQrRegion = () => {
                    while (instance._element.getElementsByClassName(
                        CONSTANTS.SHADED_REGION_CLASSNAME).length) {
                        const shadedChild = instance._element.getElementsByClassName(
                            CONSTANTS.SHADED_REGION_CLASSNAME)[0];
                        instance._element.removeChild(shadedChild);
                    }
                }
    
                const onAllTracksClosed = () => {
                    instance.localMediaStream = null;
                    instance._element.removeChild(instance._videoElement);
                    instance._element.removeChild(instance._canvasElement);
                    removeQrRegion();
                    instance.isScanning = false;
                    if (instance._qrRegion) {
                        instance._qrRegion = null;
                    }
                    if (instance._context) {
                        instance._context = null;
                    }
                    resolve(true);
                }
    
                instance.localMediaStream.getVideoTracks().forEach(videoTrack => {
                    videoTrack.stop();
                    ++tracksClosed;
    
                    if (tracksClosed >= tracksToClose) {
                        onAllTracksClosed();
                    }
                });
            });
        },
    
        /**
         * Scans an Image File for QR Code.
         *
         * This feature is mutually exclusive to camera based scanning, you should
         * call stop() if the camera based scanning was ongoing.
         *
         * @param {File} imageFile a local file with Image content.
         * @param {boolean} showImage if true the Image will be rendered on given
         * element.
         *
         * @returns Promise with decoded QR code string on success and error message
          *             on failure. Failure could happen due to different reasons:
         *            1. QR Code decode failed because enough patterns not found in
          *                 image.
         *            2. Input file was not image or unable to load the image or
          *                 other image load errors.
         */
        scanFile(imageFile, /* default=true */ showImage) {
            
            if (!imageFile || !(imageFile instanceof File)) {
                throw "imageFile argument is mandatory and should be instance "
                + "of File. Use 'event.target.files[0]'";
            }
    
            showImage = showImage === undefined ? true : showImage;
    
            if (instance.isScanning) {
                throw "Close ongoing scan before scanning a file.";
            }
    
            const computeCanvasDrawConfig = (
                imageWidth,
                imageHeight,
                containerWidth,
                containerHeight) => {
    
                if (imageWidth <= containerWidth
                    && imageHeight <= containerHeight) {
                    // no downsampling needed.
                    const xoffset = (containerWidth - imageWidth) / 2;
                    const yoffset = (containerHeight - imageHeight) / 2;
                    return {
                        x: xoffset,
                        y: yoffset,
                        width: imageWidth,
                        height: imageHeight
                    };
                } else {
                    const formerImageWidth = imageWidth;
                    const formerImageHeight = imageHeight;
                    if (imageWidth > containerWidth) {
                        imageHeight = (containerWidth / imageWidth) * imageHeight;
                        imageWidth = containerWidth;
                    }
    
                    if (imageHeight > containerHeight) {
                        imageWidth = (containerHeight / imageHeight) * imageWidth;
                        imageHeight = containerHeight;
                    }
    
                    methods._log(
                        "Image downsampled from "
                        + `${formerImageWidth}X${formerImageHeight}`
                        + ` to ${imageWidth}X${imageHeight}.`);
    
                    return computeCanvasDrawConfig(
                        imageWidth, imageHeight, containerWidth, containerHeight);
                }
            }
    
            return new Promise((resolve, reject) => {
                instance._possiblyCloseLastScanImageFile();
                instance._clearElement();
                instance._lastScanImageFile = imageFile;
    
                const inputImage = new Image;
                inputImage.onload = () => {
                    const imageWidth = inputImage.width;
                    const imageHeight = inputImage.height;
                    const element = document.getElementById(instance.elementId);
                    const containerWidth = element.clientWidth
                        ? element.clientWidth : CONSTANTS.DEFAULT_WIDTH;
                    // No default height anymore.
                    const containerHeight =  Math.max(
                        element.clientHeight ? element.clientHeight : imageHeight,
                        CONSTANTS.FILE_SCAN_MIN_HEIGHT);
    
                    const config = computeCanvasDrawConfig(
                        imageWidth, imageHeight, containerWidth, containerHeight);
                    if (showImage) {
                        const visibleCanvas = instance._createCanvasElement(
                            containerWidth, containerHeight, 'qr-canvas-visible');
                        visibleCanvas.style.display = "inline-block";
                        element.appendChild(visibleCanvas);
                        const context = visibleCanvas.getContext('2d');
                        context.canvas.width = containerWidth;
                        context.canvas.height = containerHeight;
                        // More reference
                        // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
                        context.drawImage(
                            inputImage,
                            /* sx= */ 0,
                            /* sy= */ 0,
                            /* sWidth= */ imageWidth,
                            /* sHeight= */ imageHeight,
                            /* dx= */ config.x,
                            /* dy= */  config.y,
                            /* dWidth= */ config.width,
                            /* dHeight= */ config.height);
                    }
    
                    const hiddenCanvas = instance._createCanvasElement(config.width, config.height);
                    element.appendChild(hiddenCanvas);
                    const context = hiddenCanvas.getContext('2d');
                    context.canvas.width = config.width;
                    context.canvas.height = config.height;
                    context.drawImage(
                        inputImage,
                        /* sx= */ 0,
                        /* sy= */ 0,
                        /* sWidth= */ imageWidth,
                        /* sHeight= */ imageHeight,
                        /* dx= */ 0,
                        /* dy= */  0,
                        /* dWidth= */ config.width,
                        /* dHeight= */ config.height);
                    try {
                        resolve(instance.qrcode.decode());
                    } catch (exception) {
                        reject(`QR code parse error, error = ${exception}`);
                    }
                }
    
                inputImage.onerror = reject;
                inputImage.onabort = reject;
                inputImage.onstalled = reject;
                inputImage.onsuspend = reject;
                inputImage.src = URL.createObjectURL(imageFile);
            });
        },
    
        /**
         * Clears the existing canvas.
         *
         * Note: in case of ongoing web cam based scan, it needs to be explicitly
         * closed before calling this method, else it will throw exception.
         */
        clear() {
            methods._clearElement();
        },
    
        /**
         * Returns a Promise with list of all cameras supported by the device.
         *
         * The returned object is a list of result object of type:
         * [{
         *      id: String;     // Id of the camera.
         *      label: String;  // Human readable name of the camera.
         * }]
         */
        getCameras() {
            return new Promise((resolve, reject) => {
                if (navigator.mediaDevices
                    && navigator.mediaDevices.enumerateDevices
                    && navigator.mediaDevices.getUserMedia) {
                    methods._log("navigator.mediaDevices used");
                    navigator.mediaDevices.getUserMedia(
                        { audio: false, video: true })
                        .then(stream => {
                            // hacky approach to close any active stream if they are
                            // active.
                            stream.oninactive
                                = _ => methods._log("All streams closed");
                            const closeActiveStreams = stream => {
                                const tracks = stream.getVideoTracks();
                                for (var i = 0; i < tracks.length; i++) {
                                    const track = tracks[i];
                                    track.enabled = false;
                                    track.stop();
                                    stream.removeTrack(track);
                                }
                            }
    
                            navigator.mediaDevices.enumerateDevices()
                                .then(devices => {
                                    const results = [];
                                    for (var i = 0; i < devices.length; i++) {
                                        const device = devices[i];
                                        if (device.kind == "videoinput") {
                                            results.push({
                                                id: device.deviceId,
                                                label: device.label
                                            });
                                        }
                                    }
                                    methods._log(`${results.length} results found`);
                                    closeActiveStreams(stream);
                                    resolve(results);
                                })
                                .catch(err => {
                                    reject(`${err.name} : ${err.message}`);
                                });
                        })
                        .catch(err => {
                            reject(`${err.name} : ${err.message}`);
                        })
                } else if (MediaStreamTrack && MediaStreamTrack.getSources) {
                    methods._log("MediaStreamTrack.getSources used");
                    const callback = sourceInfos => {
                        const results = [];
                        for (var i = 0; i !== sourceInfos.length; ++i) {
                            const sourceInfo = sourceInfos[i];
                            if (sourceInfo.kind === 'video') {
                                results.push({
                                    id: sourceInfo.id,
                                    label: sourceInfo.label
                                });
                            }
                        }
                        methods._log(`${results.length} results found`);
                        resolve(results);
                    }
                    MediaStreamTrack.getSources(callback);
                } else {
                    methods._log("unable to query supported devices.");
                    reject("unable to query supported devices.");
                }
            });
        },
    
        /**
         * Returns the capabilities of the running video track.
         *
         * @beta This is an experimental API
         * @returns the capabilities of a running video track.
         * @throws error if the scanning is not in running state.
         */
        getRunningTrackCapabilities() {
            if (instance.localMediaStream == null) {
                throw "Scanning is not in running state, call this API only when"
                    + " QR code scanning using camera is in running state.";
            }
    
            if (instance.localMediaStream.getVideoTracks().length == 0) {
                throw "No video tracks found";
            }
    
            const videoTrack = instance.localMediaStream.getVideoTracks()[0];
            return videoTrack.getCapabilities();
        },
    
        /**
         * Apply a video constraints on running video track from camera.
         *
         * Important:
         *  1. Must be called only if the camera based scanning is in progress.
         *  2. Changing aspectRatio while scanner is running is not yet supported.
         *
         * @beta This is an experimental API
         * @param {MediaTrackConstraints} specifies a variety of video or camera
         *  controls as defined in
         *  https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
         * @returns a Promise which succeeds if the passed constraints are applied,
         *  fails otherwise.
         * @throws error if the scanning is not in running state.
         */
        applyVideoConstraints(videoConstaints) {
            if (!videoConstaints) {
                throw "videoConstaints is required argument.";
            } else if (!methods._isMediaStreamConstraintsValid(videoConstaints)) {
                throw "invalid videoConstaints passed, check logs for more details";
            }
    
            if (instance.localMediaStream == null) {
                throw "Scanning is not in running state, call this API only when"
                    + " QR code scanning using camera is in running state.";
            }
    
            if (instance.localMediaStream.getVideoTracks().length == 0) {
                throw "No video tracks found";
            }
    
            return new Promise((resolve, reject) => {
                if ("aspectRatio" in videoConstaints) {
                    reject("Chaning 'aspectRatio' in run-time is not yet "
                        + "supported.");
                    return;
                }
                const videoTrack = instance.localMediaStream.getVideoTracks()[0];
                // TODO(mebjas): This can be simplified to just return the promise
                // directly.
                videoTrack.applyConstraints(videoConstaints)
                    .then(_ => {
                        resolve(_);
                    })
                    .catch(error => {
                        reject(error);
                    });
            });
        },
    
        _clearElement() {
            if (instance.isScanning) {
                throw 'Cannot clear while scan is ongoing, close it first.';
            }
            const element = document.getElementById(instance.elementId);
            element.innerHTML = "";
        },
    
        _createCanvasElement(width, height, customId) {
            const canvasWidth = width;
            const canvasHeight = height;
            const canvasElement = document.createElement('canvas');
            canvasElement.style.width = `${canvasWidth}px`;
            canvasElement.style.height = `${canvasHeight}px`;
            canvasElement.style.display = "none";
            // This id is set by lazarsoft/jsqrcode
            canvasElement.id = customId == undefined ? 'qr-canvas' : customId;
            return canvasElement;
        },
    
        _createVideoElement(width) {
            const videoElement = document.createElement('video');
            videoElement.style.width = `${width}px`;
            videoElement.muted = true;
            videoElement.playsInline = true;
            return videoElement;
        },
    
        _getShadedRegionBounds(width, height, qrboxSize) {
            if (qrboxSize > width || qrboxSize > height) {
                throw "'config.qrbox' should not be greater than the "
                + "width and height of the HTML element.";
            }
    
            return {
                x: (width - qrboxSize) / 2,
                y: (height - qrboxSize) / 2,
                width: qrboxSize,
                height: qrboxSize
            };
        },
    
        _possiblyInsertShadingElement(element, width, height, qrboxSize) {
          if ((width - qrboxSize) < 1 || (height - qrboxSize) < 1) {
            return;
          }
          const shadingElement = document.createElement('div');
          shadingElement.style.position = "absolute";
          shadingElement.style.borderLeft = `${(width-qrboxSize)/2}px solid #0000007a`;
          shadingElement.style.borderRight = `${(width-qrboxSize)/2}px solid #0000007a`;
          shadingElement.style.borderTop = `${(height-qrboxSize)/2}px solid #0000007a`;
          shadingElement.style.borderBottom = `${(height-qrboxSize)/2}px solid #0000007a`;
          shadingElement.style.boxSizing = "border-box";
          shadingElement.style.top = "0px";
          shadingElement.style.bottom = "0px";
          shadingElement.style.left = "0px";
          shadingElement.style.right = "0px";
          shadingElement.id = `${CONSTANTS.SHADED_REGION_CLASSNAME}`;
    
          // Check if div is too small for shadows. As there are two 5px width borders the needs to have a size above 10px.
          if ((width - qrboxSize) < 11 || (height - qrboxSize) < 11) {
            instance.hasBorderShaders = false;
          } else {
            const smallSize = 5;
            const largeSize = 40;
            methods._insertShaderBorders(shadingElement, largeSize, smallSize, -smallSize, 0, true);
            methods._insertShaderBorders(shadingElement, largeSize, smallSize, -smallSize, 0, false);
            methods._insertShaderBorders(shadingElement, largeSize, smallSize, qrboxSize+smallSize, 0, true);
            methods._insertShaderBorders(shadingElement, largeSize, smallSize, qrboxSize+smallSize, 0, false);
            methods._insertShaderBorders(shadingElement, smallSize, largeSize+smallSize, -smallSize, -smallSize, true);
            methods._insertShaderBorders(shadingElement, smallSize, largeSize+smallSize, qrboxSize+smallSize-largeSize, -smallSize, true);
            methods._insertShaderBorders(shadingElement, smallSize, largeSize+smallSize, -smallSize, -smallSize, false);
            methods._insertShaderBorders(shadingElement, smallSize, largeSize+smallSize, qrboxSize+smallSize-largeSize, -smallSize, false);
            instance.hasBorderShaders = true;
          }
          element.append(shadingElement);
    
        },
    
        _insertShaderBorders(shaderElem, width, height, top, side, isLeft) {
            const elem = document.createElement("div");
            elem.style.position = "absolute";
            elem.style.backgroundColor = CONSTANTS.BORDER_SHADER_DEFAULT_COLOR;
            elem.style.width = `${width}px`;
            elem.style.height = `${height}px`;
            elem.style.top = `${top}px`;
            if (isLeft) {
              elem.style.left = `${side}px`;
            } else {
              elem.style.right = `${side}px`;
            }
            if (!instance.borderShaders) {
              instance.borderShaders = [];
            }
            instance.borderShaders.push(elem);
            shaderElem.appendChild(elem);
        },
    
        _possiblyUpdateShaders(qrMatch) {
            if (instance.qrMatch === qrMatch) {
                return;
            }
    
            if (instance.hasBorderShaders
                && instance.borderShaders
                && instance.borderShaders.length) {
                instance.borderShaders.forEach(shader => {
                    shader.style.backgroundColor = qrMatch
                        ? CONSTANTS.BORDER_SHADER_MATCH_COLOR
                        : CONSTANTS.BORDER_SHADER_DEFAULT_COLOR;
                });
            }
            instance.qrMatch = qrMatch;
        },
    
        _possiblyCloseLastScanImageFile() {
            if (methods._lastScanImageFile) {
                URL.revokeObjectURL(methods._lastScanImageFile);
                methods._lastScanImageFile = null;
            }
        },
    
        //#region private method to create correct camera selection filter.
        _createVideoConstraints(cameraIdOrConfig) {
            if (typeof cameraIdOrConfig == "string") {
                // If it's a string it should be camera device Id.
                return { deviceId: { exact: cameraIdOrConfig } };
            } else if (typeof cameraIdOrConfig == "object") {
                const facingModeKey = "facingMode";
                const deviceIdKey = "deviceId";
                const allowedFacingModeValues
                    = { "user" : true, "environment" : true};
                const exactKey = "exact";
                const isValidFacingModeValue = value => {
                    if (value in allowedFacingModeValues) {
                        // Valid config
                        return true;
                    } else {
                        // Invalid config
                        throw "config has invalid 'facingMode' value = "
                            + `'${value}'`;
                    }
                };
    
                const keys = Object.keys(cameraIdOrConfig);
                if (keys.length != 1) {
                    throw "'cameraIdOrConfig' object should have exactly 1 key,"
                        + ` if passed as an object, found ${keys.length} keys`;
                }
    
                const key = Object.keys(cameraIdOrConfig)[0];
                if (key != facingModeKey && key != deviceIdKey) {
                    throw `Only '${facingModeKey}' and '${deviceIdKey}' `
                        + " are supported for 'cameraIdOrConfig'";
                }
    
                if (key == facingModeKey) {
                    /**
                     * Supported scenarios:
                     * - { facingMode: "user" }
                     * - { facingMode: "environment" }
                     * - { facingMode: { exact: "environment" } }
                     * - { facingMode: { exact: "user" } }
                     */
                    const facingMode = cameraIdOrConfig[key];
                    if (typeof facingMode == "string") {
                        if (isValidFacingModeValue(facingMode)) {
                            return { facingMode: facingMode };
                        }
                    } else if (typeof facingMode == "object") {
                        if (exactKey in facingMode) {
                            if (isValidFacingModeValue(facingMode[exactKey])) {
                                    return {
                                        facingMode: {
                                            exact: facingMode[exactKey]
                                        }
                                    };
                            }
                        } else {
                            throw "'facingMode' should be string or object with"
                                + ` ${exactKey} as key.`;
                        }
                    } else {
                        const type = (typeof facingMode);
                        throw `Invalid type of 'facingMode' = ${type}`;
                    }
                } else {
                    /**
                     * key == deviceIdKey; Supported scenarios:
                     * - { deviceId: { exact: "a76afe74e95e3.....38627b3bde" }
                     * - { deviceId: "a76afe74e95e3....065c9cd89438627b3bde" }
                     */
                    const deviceId = cameraIdOrConfig[key];
                    if (typeof deviceId == "string") {
                        return { deviceId: deviceId };
                    } else if (typeof deviceId == "object") {
                        if (exactKey in deviceId) {
                            return {
                                deviceId : { exact: deviceId[exactKey] }
                            };
                        } else {
                            throw "'deviceId' should be string or object with"
                                + ` ${exactKey} as key.`;
                        }
                    } else {
                        const type = (typeof deviceId);
                        throw `Invalid type of 'deviceId' = ${type}`;
                    }
                }
            } else {
                // invalid type
                const type = (typeof cameraIdOrConfig);
                throw `Invalid type of 'cameraIdOrConfig' = ${type}`;
            }
        },
        //#endregion
    
        //#region private method to check for valid videoConstraints
        _isMediaStreamConstraintsValid(videoConstraints) {
            if (!videoConstraints) {
                methods._logError(
                    "Empty videoConstraints", /* experimental= */ true);
                return false;
            }
    
            if (typeof videoConstraints !== "object") {
                const typeofVideoConstraints = typeof videoConstraints;
                methods._logError(
                    "videoConstraints should be of type object, the "
                        + `object passed is of type ${typeofVideoConstraints}.`,
                    /* experimental= */ true);
                return false;
            }
            // TODO(mebjas): Make this validity check more sophisticuated
            // Following keys are audio controls, audio controls are not supported.
            const bannedKeys = [
                "autoGainControl",
                "channelCount",
                "echoCancellation",
                "latency",
                "noiseSuppression",
                "sampleRate",
                "sampleSize",
                "volume"
            ];
            const bannedkeysSet = new Set(bannedKeys);
            const keysInVideoConstraints = Object.keys(videoConstraints);
            for (let i = 0; i < keysInVideoConstraints.length; i++) {
                const key = keysInVideoConstraints[i];
                if (bannedkeysSet.has(key)) {
                    methods._logError(
                        `${key} is not supported videoConstaints.`,
                        /* experimental= */ true);
                    return false;
                }
            }
    
            return true;
        },
        //#endregion
    
        _getTimeoutFps(fps) {
            return 1000 / fps;
        },
    
        _log(message) {
            if (CONSTANTS.VERBOSE) {
                console.log(message);
            }
        },
    
        _logError(message, experimental) {
            if (CONSTANTS.VERBOSE || experimental === true) {
                console.error(message);
            }
        }
    }

}

