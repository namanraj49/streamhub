var socket = io();

var videoCharForm = document.getElementById("video-chat-form");
var videoCharRooms = document.getElementById("video-chat-rooms");
var joinBtn = document.getElementById("join");
var userVideo = document.getElementById("user-video");
var peerVideo = document.getElementById("peer-video");
var muteButton = document.getElementById("mute-btn");
var divBtnGroup = document.getElementById("btn-group");
var hideCameraBtn = document.getElementById("hideCamera");
var leaveRoomBtn = document.getElementById("leave-room-btn");
var screenShareBtn = document.getElementById("screen-share-btn");
var fileShareBtn = document.getElementById("file-share-btn");
var fileInput = document.getElementById("file-input");
var progressBar = document.getElementById("progress-bar-inner");

var muteFlag = false;
var hideCameraFlag = false;
var screenSharing = false;

navigator.mediaDevices.getUserMedia =
  navigator.mediaDevices.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

var roomName = window.meetingRoomCode;
var creator = false;
var userStream;
var rtcPeerConnection;
var dataChannel;
var receivedBuffers = []; // Array to store received file chunks
var receivedFileSize = 0; 
var fileName = '';

var iceServer = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
  ]
};

console.log(roomName);
socket.emit("join", roomName);

muteButton.addEventListener("click", function () {
  muteFlag = !muteFlag;
  if (muteFlag) {
    userStream.getTracks()[0].enabled = false;
    muteButton.textContent = "Unmute";
  } else {
    userStream.getTracks()[0].enabled = true;
    muteButton.textContent = "Mute";
  }
});

hideCameraBtn.addEventListener("click", function () {
  hideCameraFlag = !hideCameraFlag;
  if (hideCameraFlag) {
    userStream.getTracks()[1].enabled = false;
    hideCameraBtn.textContent = "Show Camera";
  } else {
    userStream.getTracks()[1].enabled = true;
    hideCameraBtn.textContent = "Hide Camera";
  }
});

leaveRoomBtn.addEventListener("click", function () {
  socket.emit("leave", roomName);
  videoCharForm.style = "display:block";
  divBtnGroup.style = "display:none";
  if (userVideo.srcObject) {
    userVideo.srcObject.getTracks()[0].stop();
    userVideo.srcObject.getTracks()[1].stop();
  }
  if (peerVideo.srcObject) {
    peerVideo.srcObject.getTracks()[0].stop();
    peerVideo.srcObject.getTracks()[1].stop();
  }
  if (rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null;
    rtcPeerConnection.close();
  }
  window.location.href = "/home"; 
});
screenShareBtn.addEventListener("click", async function () {
  if (!screenSharing) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const videoTrack = screenStream.getVideoTracks()[0];
      const audioTrack = screenStream.getAudioTracks()[0];

      videoTrack.onended = stopScreenShare;

      if (rtcPeerConnection) {
        // Replace video track
        const videoSender = rtcPeerConnection.getSenders().find(s => s.track.kind === videoTrack.kind);
        videoSender.replaceTrack(videoTrack);

        // Replace audio track
        if (audioTrack) {
          const audioSender = rtcPeerConnection.getSenders().find(s => s.track.kind === audioTrack.kind);
          audioSender.replaceTrack(audioTrack);
        }
      }

      screenSharing = true;
      screenShareBtn.textContent = "Stop Sharing";

    } catch (error) {
      console.error("Error sharing screen: ", error);
    }
  } else {
    stopScreenShare();
  }
});

function stopScreenShare() {
  const videoTrack = userStream.getVideoTracks()[0];
  const audioTrack = userStream.getAudioTracks()[0];

  if (rtcPeerConnection) {
    // Replace video track
    const videoSender = rtcPeerConnection.getSenders().find(s => s.track.kind === videoTrack.kind);
    videoSender.replaceTrack(videoTrack);

    // Replace audio track
    const audioSender = rtcPeerConnection.getSenders().find(s => s.track.kind === audioTrack.kind);
    audioSender.replaceTrack(audioTrack);
  }

  screenSharing = false;
  screenShareBtn.textContent = "Share Screen";
}

fileShareBtn.addEventListener("click", function() {
  fileInput.click();
});

fileInput.addEventListener("change", function() {
  var file = fileInput.files[0];
  if (file) {
    sendFile(file);
  }
});

function sendFile(file) {
  if (!dataChannel || dataChannel.readyState !== 'open') {
    console.error("Data channel is not open");
    return;
  }

  var chunkSize = 16384;
  var fileReader = new FileReader();
  var offset = 0;

  fileReader.onload = function(event) {
    if (event.target.readyState === FileReader.DONE) {
      var buffer = event.target.result;
      dataChannel.send(buffer);
      offset += buffer.byteLength;
      progressBar.style.width = ((offset / file.size) * 100) + "%";

      if (offset < file.size) {
        readSlice(offset);
      } else {
        dataChannel.send(JSON.stringify({ done: true, fileName: file.name })); // Send completion message with file name
      }
    }
  };

  var readSlice = function(o) {
    var slice = file.slice(offset, o + chunkSize);
    fileReader.readAsArrayBuffer(slice);
  };
  readSlice(0);
}

socket.on("created", function () {
  creator = true;
  navigator.getUserMedia(
    {
      audio: true,
      video: true,
    },
    function (stream) {
      divBtnGroup.style = "display:flex";
      userStream = stream;
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
      setupDataChannel();
    },
    function (error) {
      alert("Access denied");
    }
  );
});

socket.on("joined", function () {
  creator = false;
  navigator.getUserMedia(
    {
      audio: true,
      video: true,
    },
    function (stream) {
      divBtnGroup.style = "display:flex";
      userVideo.srcObject = stream;
      userStream = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
      socket.emit("ready", roomName);
    },
    function (error) {
      alert("Access denied");
    }
  );
});

socket.on("full", function () {
  alert("Room is full, can't join");
});

socket.on("ready", function () {
  if (creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServer);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); //audio track
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); //video track
    setupDataChannel();
    rtcPeerConnection.createOffer(
      function (offer) {
        rtcPeerConnection.setLocalDescription(offer);
        socket.emit("offer", offer, roomName);
      },
      function (error) {
        console.log(error);
      }
    );
  }
});

socket.on("candidate", function (candidate) {
  var iceCandidate = new RTCIceCandidate(candidate);
  rtcPeerConnection.addIceCandidate(iceCandidate);
});

socket.on("offer", function (offer) {
  if (!creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServer);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); //audio track
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); //video track
    rtcPeerConnection.setRemoteDescription(offer);
    rtcPeerConnection.createAnswer(
      function (answer) {
        rtcPeerConnection.setLocalDescription(answer);
        socket.emit("answer", answer, roomName);
        setupDataChannel();
      },
      function (error) {
        console.log(error);
      }
    );
  }
});

socket.on("answer", function (answer) {
  rtcPeerConnection.setRemoteDescription(answer);
});

function OnIceCandidateFunction(event) {
  if (event.candidate) {
    socket.emit("candidate", event.candidate, roomName);
  }
}

function OnTrackFunction(event) {
  peerVideo.srcObject = event.streams[0];
  peerVideo.onloadedmetadata = function (e) {
    peerVideo.play();
  };
}

socket.on("leave", function () {
  creator = true;
  if (peerVideo.srcObject) {
    peerVideo.srcObject.getTracks()[0].stop();
    peerVideo.srcObject.getTracks()[1].stop();
  }
  if (rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null;
    rtcPeerConnection.close();
  }
});

function setupDataChannel() {
  if (creator) {
    dataChannel = rtcPeerConnection.createDataChannel("fileTransfer");
    dataChannel.onopen = handleDataChannelOpen;
    dataChannel.onclose = handleDataChannelClose;
    dataChannel.onmessage = handleDataChannelMessage;
  } else {
    rtcPeerConnection.ondatachannel = function(event) {
      dataChannel = event.channel;
      dataChannel.onopen = handleDataChannelOpen;
      dataChannel.onclose = handleDataChannelClose;
      dataChannel.onmessage = handleDataChannelMessage;
    };
  }
}

function handleDataChannelOpen(event) {
  console.log("Data channel is open");
}

function handleDataChannelClose(event) {
  console.log("Data channel is closed");
}

function handleDataChannelMessage(event) {
  if (typeof event.data === "string") {
    var message = JSON.parse(event.data);
    if (message.done) {
      fileName = message.fileName;
      var receivedBlob = new Blob(receivedBuffers);
      var downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(receivedBlob);
      downloadLink.download = fileName;
      downloadLink.click();
      receivedBuffers = [];
      progressBar.style.width = "0%";
    }
  } else {
    receivedBuffers.push(event.data);
    receivedFileSize += event.data.byteLength;
    progressBar.style.width = ((receivedFileSize / message.fileSize) * 100) + "%";
  }
}
