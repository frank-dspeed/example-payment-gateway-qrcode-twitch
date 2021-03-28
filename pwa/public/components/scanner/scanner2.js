import { Html5Qrcode } from './github.com/mebjas/html5-qrcode/html5-qrcode.js';

/**
 * Creates instance of Scanner Element.
 *
 * @param {String} elementId - Id of the HTML element.
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
 * @param {Boolean} verbose - Optional argument, if true, all logs
 *                  would be printed to console. 
 */
export const getInstance = (elementId, config, verbose) => {

    const CONSTANTS = {};
    CONSTANTS.SCAN_TYPE_CAMERA = "SCAN_TYPE_CAMERA";
    CONSTANTS.SCAN_TYPE_FILE = "SCAN_TYPE_FILE";
    CONSTANTS.STATUS_SUCCESS = "STATUS_SUCCESS";
    CONSTANTS.STATUS_WARNING = "STATUS_WARNING";
    CONSTANTS.STATUS_DEFAULT = "STATUS_DEFAULT";

    CONSTANTS.ASSET_FILE_SCAN = "https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/file-scan.gif";
    CONSTANTS.ASSET_CAMERA_SCAN = "https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/camera-scan.gif";

    const instance = {};
    instance.elementId = elementId;
    instance.config = config;
    instance.verbose = verbose === true;

    if (!document.getElementById(elementId)) {
        throw `HTML Element with id=${elementId} not found`;
    }

    instance.element = document.getElementById(elementId);

    instance.currentScanType = CONSTANTS.SCAN_TYPE_CAMERA;
    instance.sectionSwapAllowed = true;

    instance.section = undefined;
    instance.html5Qrcode = undefined;
    instance.qrCodeSuccessCallback = undefined;
    instance.qrCodeErrorCallback = undefined;
    instance.lastMatchFound = undefined;

    const methods = {
        /**
         * Renders the User Interface
         * 
         * @param {Function} qrCodeSuccessCallback - callback on QR Code found.
         *  Example:
         *      function(qrCodeMessage) {}
         * @param {Function} qrCodeErrorCallback - callback on QR Code parse error.
         *  Example:
         *      function(errorMessage) {}
         * 
         */
        render(qrCodeSuccessCallback, qrCodeErrorCallback) {
            //const instance = this;
            instance.lastMatchFound = undefined;
            // Add wrapper to success callback.
            instance.qrCodeSuccessCallback = message => {
                methods.__setStatus("MATCH", CONSTANTS.STATUS_SUCCESS);
                if (qrCodeSuccessCallback) {
                    qrCodeSuccessCallback(message);
                } else {
                    if (instance.lastMatchFound == message) {
                        return;
                    }
                    instance.lastMatchFound = message;
                    methods.__setHeaderMessage(
                        `Last Match: ${message}`, CONSTANTS.STATUS_SUCCESS);
                }
            }
    
            // Add wrapper to failure callback
            instance.qrCodeErrorCallback = error => {
                methods.__setStatus("Scanning");
                if (qrCodeErrorCallback) {
                    qrCodeErrorCallback(error);
                }
            }
    
            const container = instance.element;
            container.innerHTML = "";
            methods.__createBasicLayout(container);
    
            instance.html5Qrcode = new Html5Qrcode(
                methods.__getScanRegionId(), instance.verbose);
        },
    
        /**
         * Removes the QR Code scanner.
         * 
         * @returns Promise which succeeds if the cleanup is complete successfully,
         *  fails otherwise.
         */
        clear() {
            //const instance = this;
            const emptyHtmlContainer = () => {
                const mainContainer = instance.element;
                if (mainContainer) {
                    mainContainer.innerHTML = "";
                    methods.__resetBasicLayout(mainContainer);
                }
            }
    
            if (instance.html5Qrcode) {
                return new Promise((resolve, reject) => {
                    if (instance.html5Qrcode._isScanning) {
                        instance.html5Qrcode.stop().then(_ => {
                            instance.html5Qrcode.clear();
                            emptyHtmlContainer();
                            resolve();
                        }).catch(error => {
                            if (instance.verbose) {
                                console.error("Unable to stop qrcode scanner", error);
                            }
                            reject(error);
                        })
                    }
                });
            }
        },
    
        //#region private control methods
        __createBasicLayout(parent) {
            parent.style.position = "relative";
            parent.style.padding = "0px";
            parent.style.border = "1px solid silver";
            methods.__createHeader(parent);
    
            const qrCodeScanRegion = document.createElement("div");
            const scanRegionId = methods.__getScanRegionId();
            qrCodeScanRegion.id = scanRegionId;
            qrCodeScanRegion.style.width = "100%"; //"320px";
            qrCodeScanRegion.style.minHeight = "100px";
            qrCodeScanRegion.style.textAlign = "center";
            parent.appendChild(qrCodeScanRegion);
            methods.__insertCameraScanImageToScanRegion();
    
            const qrCodeDashboard = document.createElement("div");
            const dashboardId = methods.__getDashboardId();
            qrCodeDashboard.id = dashboardId;
            qrCodeDashboard.style.width = "100%";
            parent.appendChild(qrCodeDashboard);
    
            methods.__setupInitialDashboard(qrCodeDashboard);
        },
        
        __resetBasicLayout(parent) {
            parent.style.border = "none";
        },
    
        __setupInitialDashboard(dashboard) {
            methods.__createSection(dashboard);
            methods.__createSectionControlPanel();
            methods.__createSectionSwap();
        },
    
        __createHeader(dashboard) {
            const header = document.createElement("div");
            header.style.textAlign = "left";
            header.style.margin = "0px";
            header.style.padding = "5px";
            header.style.fontSize = "20px";
            header.style.borderBottom = "1px solid rgba(192, 192, 192, 0.18)";
            dashboard.appendChild(header);
    
            const titleSpan = document.createElement("span");
            titleSpan.innerHTML = "QR Code Scanner";
            header.appendChild(titleSpan);
    
            const statusSpan = document.createElement("span");
            statusSpan.id = methods.__getStatusSpanId();
            statusSpan.style.float = "right";
            statusSpan.style.padding = "5px 7px";
            statusSpan.style.fontSize = "14px";
            statusSpan.style.background = "#dedede6b";
            statusSpan.style.border = "1px solid #00000000";
            statusSpan.style.color = "rgb(17, 17, 17)";
            header.appendChild(statusSpan);
            methods.__setStatus("IDLE");
    
            const headerMessageContainer = document.createElement("div");
            headerMessageContainer.id = methods.__getHeaderMessageContainerId();
            headerMessageContainer.style.display = "none";
            headerMessageContainer.style.fontSize = "14px";
            headerMessageContainer.style.padding = "2px 10px";
            headerMessageContainer.style.marginTop = "4px";
            headerMessageContainer.style.borderTop = "1px solid #f6f6f6";
            header.appendChild(headerMessageContainer);
        },
    
        __createSection(dashboard) {
            const section = document.createElement("div");
            section.id = methods.__getDashboardSectionId();
            section.style.width = "100%";
            section.style.padding = "10px";
            section.style.textAlign = "left";
            dashboard.appendChild(section);
        },
    
        __createSectionControlPanel() {
            //const instance = this;
            const section = document.getElementById(methods.__getDashboardSectionId());
            const sectionControlPanel = document.createElement("div");
            section.appendChild(sectionControlPanel);
            const scpCameraScanRegion = document.createElement("div");
            scpCameraScanRegion.id = methods.__getDashboardSectionCameraScanRegionId();
            scpCameraScanRegion.style.display
                = instance.currentScanType == CONSTANTS.SCAN_TYPE_CAMERA
                    ? "block" : "none";
            sectionControlPanel.appendChild(scpCameraScanRegion);
    
            // Assuming when the object is created permission is needed.
            const requestPermissionContainer = document.createElement("div");
            requestPermissionContainer.style.textAlign = "center";
    
            const requestPermissionButton = document.createElement("button");
            requestPermissionButton.innerHTML = "Request Camera Permissions";
            requestPermissionButton.addEventListener("click", function () {
                requestPermissionButton.disabled = true;
                methods.__setStatus("PERMISSION");
                methods.__setHeaderMessage("Requesting camera permissions...");
    
                Html5Qrcode.getCameras().then(cameras => {
                    methods.__setStatus("IDLE");
                    methods.__resetHeaderMessage();
                    if (!cameras || cameras.length == 0) {
                        methods.__setStatus(
                            "No Cameras", CONSTANTS.STATUS_WARNING);
                    } else {
                        scpCameraScanRegion.removeChild(requestPermissionContainer);
                        methods.__renderCameraSelection(cameras);
                    }
                }).catch(error => {
                    requestPermissionButton.disabled = false;
                    methods.__setStatus("IDLE");
                    methods.__setHeaderMessage(error, CONSTANTS.STATUS_WARNING);
                });
            });
            requestPermissionContainer.appendChild(requestPermissionButton);
            scpCameraScanRegion.appendChild(requestPermissionContainer);
    
            const fileBasedScanRegion = document.createElement("div");
            fileBasedScanRegion.id = methods.__getDashboardSectionFileScanRegionId();
            fileBasedScanRegion.style.textAlign = "center";
            fileBasedScanRegion.style.display
                = instance.currentScanType == CONSTANTS.SCAN_TYPE_CAMERA
                    ? "none" : "block";
            sectionControlPanel.appendChild(fileBasedScanRegion);
    
            const fileScanInput = document.createElement("input");
            fileScanInput.id = methods.__getFileScanInputId();
            fileScanInput.accept = "image/*";
            fileScanInput.type = "file";
            fileScanInput.style.width = "200px";
            fileScanInput.disabled
                = instance.currentScanType == CONSTANTS.SCAN_TYPE_CAMERA;
            const fileScanLabel = document.createElement("span");
            fileScanLabel.innerHTML = "&nbsp; Select Image";
            fileBasedScanRegion.appendChild(fileScanInput);
            fileBasedScanRegion.appendChild(fileScanLabel);
            fileScanInput.addEventListener('change', e => {
                if (instance.currentScanType !== CONSTANTS.SCAN_TYPE_FILE) {
                    return;
                }
                if (e.target.files.length == 0) {
                    return;
                }
                const file = e.target.files[0];
                instance.html5Qrcode.scanFile(file, true)
                    .then(qrCode => {
                        methods.__resetHeaderMessage();
                        instance.qrCodeSuccessCallback(qrCode);
                    })
                    .catch(error => {
                        methods.__setStatus("ERROR", CONSTANTS.STATUS_WARNING);
                        methods.__setHeaderMessage(error, CONSTANTS.STATUS_WARNING);
                        instance.qrCodeErrorCallback(error);
                    });
            });
        },
    
        __renderCameraSelection(cameras) {
            //const instance = this;
            const scpCameraScanRegion = document.getElementById(
                methods.__getDashboardSectionCameraScanRegionId());
            scpCameraScanRegion.style.textAlign = "center";
    
            const cameraSelectionContainer = document.createElement("span");
            cameraSelectionContainer.innerHTML
                = `Select Camera (${cameras.length}) &nbsp;`;
            cameraSelectionContainer.style.marginRight = "10px";
    
            const cameraSelectionSelect = document.createElement("select");
            cameraSelectionSelect.id = methods.__getCameraSelectionId();
            for (var i = 0; i < cameras.length; i++) {
                const camera = cameras[i];
                const value = camera.id;
                const name = camera.label == null ? value : camera.label;
                const option = document.createElement('option');
                option.value = value;
                option.innerHTML = name;
                cameraSelectionSelect.appendChild(option);
            }
            cameraSelectionContainer.appendChild(cameraSelectionSelect);
            scpCameraScanRegion.appendChild(cameraSelectionContainer);
    
            const cameraActionContainer = document.createElement("span");
            const cameraActionStartButton = document.createElement("button");
            cameraActionStartButton.innerHTML = "Start Scanning";
            cameraActionContainer.appendChild(cameraActionStartButton);
    
            const cameraActionStopButton = document.createElement("button");
            cameraActionStopButton.innerHTML = "Stop Scanning";
            cameraActionStopButton.style.display = "none";
            cameraActionStopButton.disabled = true;
            cameraActionContainer.appendChild(cameraActionStopButton);
    
            scpCameraScanRegion.appendChild(cameraActionContainer);
    
            cameraActionStartButton.addEventListener('click', _ => {
                cameraSelectionSelect.disabled = true;
                cameraActionStartButton.disabled = true;
                instance._showHideScanTypeSwapLink(false);
    
                const config = instance.config ?
                    instance.config : { fps: 10, qrbox: 250 };
    
                const cameraId = cameraSelectionSelect.value;
                instance.html5Qrcode.start(
                    cameraId,
                    config,
                    instance.qrCodeSuccessCallback,
                    instance.qrCodeErrorCallback)
                    .then(_ => {
                        cameraActionStopButton.disabled = false;
                        cameraActionStopButton.style.display = "inline-block";
                        cameraActionStartButton.style.display = "none";
                        methods.__setStatus("Scanning");
                    })
                    .catch(error => {
                        instance._showHideScanTypeSwapLink(true);
                        cameraSelectionSelect.disabled = false;
                        cameraActionStartButton.disabled = false;
                        methods.__setStatus("IDLE");
                        methods.__setHeaderMessage(
                            error, CONSTANTS.STATUS_WARNING);
                    });
            });
    
            cameraActionStopButton.addEventListener('click', _ => {
                cameraActionStopButton.disabled = true;
                instance.html5Qrcode.stop()
                    .then(_ => {
                        instance._showHideScanTypeSwapLink(true);
                        cameraSelectionSelect.disabled = false;
                        cameraActionStartButton.disabled = false;
                        cameraActionStopButton.style.display = "none";
                        cameraActionStartButton.style.display = "inline-block";
                        methods.__setStatus("IDLE");
                        methods.__insertCameraScanImageToScanRegion();
                    }).catch(error => {
                        cameraActionStopButton.disabled = false;
                        methods.__setStatus("ERROR", CONSTANTS.STATUS_WARNING);
                        methods.__setHeaderMessage(
                            error, CONSTANTS.STATUS_WARNING);
                    });
            });
        },
    
        __createSectionSwap() {
            //const instance = this;
            const TEXT_IF_CAMERA_SCAN_SELECTED
                = "Scan an Image File";
            const TEXT_IF_FILE_SCAN_SELECTED
                = "Scan using camera directly";
    
            const section = document.getElementById(methods.__getDashboardSectionId());
            const switchContainer = document.createElement("div");
            switchContainer.style.textAlign = "center";
            const swithToFileBasedLink = document.createElement("a");
            swithToFileBasedLink.style.textDecoration = "underline";
            swithToFileBasedLink.id = methods.__getDashboardSectionSwapLinkId();
            swithToFileBasedLink.innerHTML
                = instance.currentScanType == CONSTANTS.SCAN_TYPE_CAMERA
                    ? TEXT_IF_CAMERA_SCAN_SELECTED : TEXT_IF_FILE_SCAN_SELECTED;
            swithToFileBasedLink.href = "#scan-using-file";
            swithToFileBasedLink.addEventListener('click', function () {
                if (!instance.sectionSwapAllowed) {
                    if (instance.verbose) {
                        console.error("Section swap called when not allowed");
                    }
                    return;
                }
    
                // Cleanup states
                methods.__setStatus("IDLE");
                methods.__resetHeaderMessage();
                methods.__getFileScanInput().value = "";
    
                instance.sectionSwapAllowed = false;
                if (instance.currentScanType == CONSTANTS.SCAN_TYPE_CAMERA) {
                    // swap to file
                    methods.__clearScanRegion();
                    methods.__getFileScanInput().disabled = false;
                    methods.__getCameraScanRegion().style.display = "none";
                    methods.__getFileScanRegion().style.display = "block";
                    swithToFileBasedLink.innerHTML = TEXT_IF_FILE_SCAN_SELECTED;
                    instance.currentScanType = CONSTANTS.SCAN_TYPE_FILE;
                    methods.__insertFileScanImageToScanRegion();
                } else {
                    // swap to camera based scanning
                    methods.__clearScanRegion();
                    methods.__getFileScanInput().disabled = true;
                    methods.__getCameraScanRegion().style.display = "block";
                    methods.__getFileScanRegion().style.display = "none";
                    swithToFileBasedLink.innerHTML = TEXT_IF_CAMERA_SCAN_SELECTED;
                    instance.currentScanType = CONSTANTS.SCAN_TYPE_CAMERA;
                    methods.__insertCameraScanImageToScanRegion();
                }
    
                instance.sectionSwapAllowed = true;
            });
            switchContainer.appendChild(swithToFileBasedLink);
            section.appendChild(switchContainer);
        },
    
        __setStatus(statusText, statusClass) {
            if (!statusClass) {
                statusClass = CONSTANTS.STATUS_DEFAULT;
            }
            const statusSpan = document.getElementById(methods.__getStatusSpanId());
            statusSpan.innerHTML = statusText;
    
            switch (statusClass) {
                case CONSTANTS.STATUS_SUCCESS:
                    statusSpan.style.background = "#6aaf5042";
                    statusSpan.style.color = "#477735";
                    break;
                case CONSTANTS.STATUS_WARNING:
                    statusSpan.style.background = "#cb243124";
                    statusSpan.style.color = "#cb2431";
                    break;
                case CONSTANTS.STATUS_DEFAULT:
                default:
                    statusSpan.style.background = "#eef";
                    statusSpan.style.color = "rgb(17, 17, 17)";
                    break;
            }
        },
    
        __resetHeaderMessage() {
            const messageDiv = document.getElementById(
                methods.__getHeaderMessageContainerId());
            messageDiv.style.display = "none";
        },
    
        __setHeaderMessage(messageText, statusClass) {
            if (!statusClass) {
                statusClass = CONSTANTS.STATUS_DEFAULT;
            }
            const messageDiv = document.getElementById(
                methods.__getHeaderMessageContainerId());
            messageDiv.innerHTML = messageText;
            messageDiv.style.display = "block";
    
            switch (statusClass) {
                case CONSTANTS.STATUS_SUCCESS:
                    messageDiv.style.background = "#6aaf5042";
                    messageDiv.style.color = "#477735";
                    break;
                case CONSTANTS.STATUS_WARNING:
                    messageDiv.style.background = "#cb243124";
                    messageDiv.style.color = "#cb2431";
                    break;
                case CONSTANTS.STATUS_DEFAULT:
                default:
                    messageDiv.style.background = "#00000000";
                    messageDiv.style.color = "rgb(17, 17, 17)";
                    break;
            }
        },
    
        _showHideScanTypeSwapLink(shouldDisplay) {
            if (shouldDisplay !== true) {
                shouldDisplay = false;
            }
    
            instance.sectionSwapAllowed = shouldDisplay;
            methods.__getDashboardSectionSwapLink().style.display
                = shouldDisplay ? "inline-block" : "none";
        },
    
        __insertCameraScanImageToScanRegion() {
            //const instance = this;
            const qrCodeScanRegion = document.getElementById(
                methods.__getScanRegionId());
    
            if (instance.cameraScanImage) {
                qrCodeScanRegion.innerHTML = "<br>";
                qrCodeScanRegion.appendChild(instance.cameraScanImage);
                return;
            }
    
            instance.cameraScanImage = new Image;
            instance.cameraScanImage.onload = _ => {
                qrCodeScanRegion.innerHTML = "<br>";
                qrCodeScanRegion.appendChild(instance.cameraScanImage);
            }
            instance.cameraScanImage.width = 64;
            instance.cameraScanImage.style.opacity = 0.3;
            instance.cameraScanImage.src = CONSTANTS.ASSET_CAMERA_SCAN;
        },
    
        __insertFileScanImageToScanRegion() {
            //const instance = this;
            const qrCodeScanRegion = document.getElementById(
                methods.__getScanRegionId());
    
            if (instance.fileScanImage) {
                qrCodeScanRegion.innerHTML = "<br>";
                qrCodeScanRegion.appendChild(instance.fileScanImage);
                return;
            }
    
            instance.fileScanImage = new Image;
            instance.fileScanImage.onload = _ => {
                qrCodeScanRegion.innerHTML = "<br>";
                qrCodeScanRegion.appendChild(instance.fileScanImage);
            }
            instance.fileScanImage.width = 64;
            instance.fileScanImage.style.opacity = 0.3;
            instance.fileScanImage.src = CONSTANTS.ASSET_FILE_SCAN;
        },
    
        __clearScanRegion() {
            const qrCodeScanRegion = document.getElementById(
                methods.__getScanRegionId());
            qrCodeScanRegion.innerHTML = "";
        },
        //#endregion
    
        //#region state getters
        __getDashboardSectionId() {
            return `${instance.elementId}__dashboard_section`;
        },
    
        __getDashboardSectionCameraScanRegionId() {
            return `${instance.elementId}__dashboard_section_csr`;
        },
    
        __getDashboardSectionFileScanRegionId() {
            return `${instance.elementId}__dashboard_section_fsr`;
        },
    
        __getDashboardSectionSwapLinkId() {
            return `${instance.elementId}__dashboard_section_swaplink`;
        },
    
        __getScanRegionId() {
            return `${instance.elementId}__scan_region`;
        },
    
        __getDashboardId() {
            return `${instance.elementId}__dashboard`;
        },
    
        __getFileScanInputId() {
            return `${instance.elementId}__filescan_input`;
        },
    
        __getStatusSpanId() {
            return `${instance.elementId}__status_span`;
        },
    
        __getHeaderMessageContainerId() {
            return `${instance.elementId}__header_message`;
        },
    
        __getCameraSelectionId() {
            return `${instance.elementId}__camera_selection`;
        },
    
        __getCameraScanRegion() {
            return document.getElementById(
                methods.__getDashboardSectionCameraScanRegionId());
        },
    
        __getFileScanRegion() {
            return document.getElementById(
                methods.__getDashboardSectionFileScanRegionId());
        },
    
        __getFileScanInput() {
            return document.getElementById(methods.__getFileScanInputId());
        },
    
        __getDashboardSectionSwapLink() {
            return document.getElementById(methods.__getDashboardSectionSwapLinkId());
        }
        //#endregion
    }
    return instance;
}
