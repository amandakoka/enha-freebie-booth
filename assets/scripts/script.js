const video = document.getElementById("video");
const clickBtn = document.getElementById("click-btn");
const photosContainer = document.getElementById("photos");
const toggleBtn = document.getElementById("toggle-members-btn");
const membersDiv = document.querySelector(".members");
const overlayImg = document.getElementById("overlay-image");
const timerInput = document.getElementById("timer");

// Store camera aspect ratio
let cameraAspectRatio = 4/3;
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
  ctx.scale(-1, 1);  // Reverse the mirror effect
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
  
  // First load all images properly
  const loadImages = stripPhotos.map(photoUrl => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = photoUrl;
    });
  });

  // Wait for ALL images to load before creating strip
  Promise.all(loadImages).then(images => {
    const firstImage = images[0];
    const photoWidth = firstImage.width;
    const photoHeight = firstImage.height;
    const gap = 15;
    const borderWidth = 2;
    
    // Set canvas dimensions (add borders)
    canvas.width = photoWidth + (borderWidth * 2);
    canvas.height = (photoHeight * 4) + (gap * 3) + (borderWidth * 2) + 30;
    
    // Draw black background
    ctx.fillStyle = "#000B20";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw white border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Draw each photo with borders
    let yPos = borderWidth + 5;
    images.forEach((img, index) => {
      // Draw photo
      ctx.drawImage(img, borderWidth, yPos, photoWidth, photoHeight);
      
      // Draw separator line (except after last photo)
      if (index < 3) {
        yPos += photoHeight + gap;
        ctx.beginPath();
        ctx.moveTo(borderWidth, yPos - (gap/2));
        ctx.lineTo(canvas.width - borderWidth, yPos - (gap/2));
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    
    // Add footer text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ENHYPEN PHOTOBOOTH", canvas.width/2, canvas.height - 10);
    
    // Trigger download
    const link = document.createElement("a");
    link.download = "enhypen-strip.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    
    // Reset for new strip after download
    capturedPhotos = [];
    photoCount = 0;
    clickBtn.disabled = false;
    clickBtn.textContent = "Take Photo";
    photosContainer.innerHTML = "";
  });
}

// Initialize
initCamera();