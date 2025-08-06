const video = document.getElementById("video");
const clickBtn = document.getElementById("click-btn");
const photosContainer = document.getElementById("photos");
const toggleBtn = document.getElementById("toggle-members-btn");
const membersDiv = document.querySelector(".members");
const overlayImg = document.getElementById("overlay-image");
const timerInput = document.getElementById("timer");

// Store camera aspect ratio
let cameraAspectRatio = 4 / 3;
let capturedPhotos = [];
let countdownInterval = null;
let photoCount = 0; // Track number of photos taken
const MAX_PHOTOS = 4; // Photo limit per strip

// Initialize camera
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 960 } // 4:3 ratio
      }
    });
    video.srcObject = stream;

    // Wait for video metadata to load
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        cameraAspectRatio = video.videoWidth / video.videoHeight;
        video.style.aspectRatio = cameraAspectRatio;
        resolve();
      };
    });
  } catch (err) {
    console.error("Camera error:", err);
    alert("Could not access camera. Please enable permissions.");
  }
}

// Toggle members visibility
toggleBtn.addEventListener("click", () => {
  membersDiv.style.display = membersDiv.style.display === "none" ? "grid" : "none";
  toggleBtn.textContent = membersDiv.style.display === "none" ? "Show Members" : "Hide Members";
});

// Member selection
document.querySelectorAll(".members img").forEach(img => {
  img.addEventListener("click", () => {
    overlayImg.src = img.src;
  });
});

// Capture photo with timer
clickBtn.addEventListener("click", () => {
  // Check photo limit first
  if (photoCount >= MAX_PHOTOS) {
    alert("You can only take 4 photos per strip. Please download your current strip first.");
    return;
  }

  const timerValue = parseInt(timerInput.value) || 0;

  if (timerValue > 0) {
    // Start countdown if timer is set
    clickBtn.disabled = true;
    let remaining = timerValue;

    countdownInterval = setInterval(() => {
      clickBtn.textContent = `Taking photo in ${remaining}s`;
      remaining--;

      if (remaining < 0) {
        clearInterval(countdownInterval);
        clickBtn.textContent = "Take Photo";
        clickBtn.disabled = false;
        capturePhoto();
      }
    }, 1000);
  } else {
    // Take photo immediately if no timer
    capturePhoto();
  }
});

async function capturePhoto() {
  if (photoCount >= MAX_PHOTOS) return; // Double-check limit

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");

  // (A) Temporarily unflip the video for capture
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1); // Reverse the mirror effect
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

  // (B) Draw overlay normally
  if (overlayImg.src && overlayImg.complete) {
    ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
  }

  capturedPhotos.push(canvas.toDataURL("image/png"));
  photoCount++; // Increment photo counter

  updatePhotoStrip();

  // Disable button if limit reached
  if (photoCount >= MAX_PHOTOS) {
    clickBtn.disabled = true;
    clickBtn.textContent = "Strip Full (4/4)";
  }
}

function updatePhotoStrip() {
  photosContainer.innerHTML = '';

  if (capturedPhotos.length === 0) return;

  const strip = document.createElement("div");
  strip.className = "strip";

  capturedPhotos.forEach(photoUrl => {
    const img = document.createElement("img");
    img.src = photoUrl;
    img.className = "strip-photo";
    img.style.aspectRatio = cameraAspectRatio;
    strip.appendChild(img);
  });

  if (capturedPhotos.length >= 4) {
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "download-btn";
    downloadBtn.textContent = "Download Strip";
    downloadBtn.addEventListener("click", downloadPhotoStrip);
    strip.appendChild(downloadBtn);
  }

  photosContainer.appendChild(strip);
}

function downloadPhotoStrip() {
  if (capturedPhotos.length < 4) return;

  const stripPhotos = capturedPhotos.slice(-4);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Set dimensions
  const targetWidth = 1500;
  const photoHeight = Math.round(targetWidth * (3/4));
  const borderWidth = 60;
  const gap = 60;
  const footerHeight = 120;

  canvas.width = targetWidth + (borderWidth * 2);
  canvas.height = (photoHeight * 4) + (gap * 3) + (borderWidth * 2) + footerHeight;

  // Draw background
  ctx.fillStyle = "#033150";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Process photos
  let yPos = borderWidth;
  const promises = stripPhotos.map(photoUrl => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        // Blue border around each photo
        ctx.strokeStyle = "#033150";
        ctx.lineWidth = 8;
        ctx.strokeRect(borderWidth, yPos, targetWidth, photoHeight);
        
        // Calculate scaling
        const scale = Math.min(
          (targetWidth - 16) / img.width,
          (photoHeight - 16) / img.height
        );
        const width = img.width * scale;
        const height = img.height * scale;
        const xOffset = borderWidth + (targetWidth - width)/2;
        const yOffset = yPos + (photoHeight - height)/2;
        
        // Draw photo 
        ctx.drawImage(img, xOffset, yOffset, width, height);

        yPos += photoHeight + gap;
        resolve();
      };
      img.src = photoUrl;
    });
  });

  Promise.all(promises).then(() => {
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.font = "bold 100px Arial";
    ctx.fillText("ENHYPEN WTL 2025", canvas.width/2, canvas.height - 60);

    // Trigger download
    const link = document.createElement("a");
    link.download = `enhypen-wtl-freebie.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
    
    // Reset
    capturedPhotos = [];
    photoCount = 0;
    document.getElementById('click-btn').disabled = false;
    document.getElementById('click-btn').textContent = "Take Photo";
    document.getElementById('photos').innerHTML = "";
  });
}

// Initialize
initCamera();