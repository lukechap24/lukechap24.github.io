function loadGalleryScript(section, galleryKey) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `/galleries/${section}/${galleryKey}.js`;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function makeThumb(url) {
  return url.replace(
    "/upload/",
    "/upload/w_400,h_500,c_fill,q_auto,f_auto/"
  );
}

function makeFull(url) {
  return url.replace(
    "/upload/",
    "/upload/w_1400,q_auto,f_auto/"
  );
}

const config = window.galleryPageConfig || {};
const section = config.section;
const galleryKey = config.galleryKey;

const thumbGrid = document.getElementById("thumb-grid");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const backLink = document.getElementById("back-link");
const closeLightboxBtn = document.getElementById("close-lightbox");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const travelsLink = document.getElementById("travels-link");
const coloradoLink = document.getElementById("colorado-link");
const galleryTitleEl = document.getElementById("gallery-title");
const gallerySubtitleEl = document.getElementById("gallery-subtitle");
const lightboxTitleEl = document.getElementById("lightbox-title");

let currentIndex = 0;
let isTransitioning = false;
const preloadedImages = new Map();

function preloadImage(src) {
  if (preloadedImages.has(src)) {
    return preloadedImages.get(src);
  }

  const img = new Image();
  const promise = new Promise((resolve) => {
    img.onload = () => resolve(src);
    img.onerror = () => resolve(src);
  });

  img.src = src;
  preloadedImages.set(src, promise);
  return promise;
}

function preloadNeighbors(index) {
  if (!window.gallery || !gallery.photos || !gallery.photos.length) return;

  const prevIndex = (index - 1 + gallery.photos.length) % gallery.photos.length;
  const nextIndex = (index + 1) % gallery.photos.length;

  preloadImage(makeFull(gallery.photos[prevIndex]));
  preloadImage(makeFull(gallery.photos[nextIndex]));
}

function renderThumbnails() {
  thumbGrid.innerHTML = "";

  gallery.photos.forEach((photoUrl, index) => {
    const thumb = document.createElement("div");
    thumb.className = "thumb";

    const img = document.createElement("img");
    img.src = makeThumb(photoUrl);
    img.loading = index < 6 ? "eager" : "lazy";
    img.alt = `${gallery.title} photograph ${index + 1}`;

    if (img.complete) {
      img.classList.add("loaded");
    } else {
      img.addEventListener("load", function () {
        img.classList.add("loaded");
      });
    }

    thumb.appendChild(img);
    thumb.addEventListener("click", function () {
      openLightbox(index);
    });

    thumbGrid.appendChild(thumb);
  });
}

async function updateLightboxImage(index) {
  if (isTransitioning) return;
  isTransitioning = true;

  currentIndex = index;
  const newSrc = makeFull(gallery.photos[currentIndex]);

  prevBtn.disabled = true;
  nextBtn.disabled = true;

  lightboxImg.classList.remove("loaded");
  lightboxImg.classList.add("fade-out");

  await preloadImage(newSrc);

  setTimeout(() => {
    lightboxImg.onload = function () {
      requestAnimationFrame(() => {
        lightboxImg.classList.remove("fade-out");
        lightboxImg.classList.add("loaded");
        prevBtn.disabled = false;
        nextBtn.disabled = false;
        isTransitioning = false;
        preloadNeighbors(currentIndex);
      });
    };

    lightboxImg.src = newSrc;
    lightboxImg.alt = `${gallery.title} photograph ${currentIndex + 1}`;
  }, 180);
}

function openLightbox(index) {
  lightbox.classList.add("open");
  updateLightboxImage(index);
}

function closeLightbox() {
  lightbox.classList.remove("open");
}

function showPrevImage() {
  const nextIndex =
    (currentIndex - 1 + gallery.photos.length) % gallery.photos.length;
  updateLightboxImage(nextIndex);
}

function showNextImage() {
  const nextIndex = (currentIndex + 1) % gallery.photos.length;
  updateLightboxImage(nextIndex);
}

async function initGalleryPage() {
  if (!section || !galleryKey) {
    console.error("Missing galleryPageConfig.section or galleryPageConfig.galleryKey");
    return;
  }

  try {
    await loadGalleryScript(section, galleryKey);
  } catch (error) {
    console.error(`Failed to load gallery script for ${section}/${galleryKey}.js`, error);
    if (galleryTitleEl) galleryTitleEl.textContent = "Gallery not found";
    if (gallerySubtitleEl) gallerySubtitleEl.textContent = "Please check the album path or file name.";
    return;
  }

  document.title = `Luke Chapman Photography — ${gallery.title}`;
  if (galleryTitleEl) galleryTitleEl.textContent = gallery.title;
  if (gallerySubtitleEl) {
    gallerySubtitleEl.textContent = `${gallery.date} · ${gallery.photos.length} photographs`;
  }
  if (lightboxTitleEl) lightboxTitleEl.textContent = gallery.title;

  if (backLink) {
    backLink.href = `/${section}/`;
  }

  if (section === "travels" && travelsLink) {
    travelsLink.classList.add("active");
  } else if (section === "colorado" && coloradoLink) {
    coloradoLink.classList.add("active");
  }

  renderThumbnails();
}

if (backLink) {
  backLink.addEventListener("click", function (event) {
    event.preventDefault();
    window.location.href = `/${section}/`;
  });
}

if (closeLightboxBtn) {
  closeLightboxBtn.addEventListener("click", closeLightbox);
}

if (prevBtn) {
  prevBtn.addEventListener("click", showPrevImage);
}

if (nextBtn) {
  nextBtn.addEventListener("click", showNextImage);
}

document.addEventListener("keydown", function (event) {
  if (!lightbox || !lightbox.classList.contains("open")) return;

  if (event.key === "Escape") {
    closeLightbox();
  } else if (event.key === "ArrowLeft") {
    showPrevImage();
  } else if (event.key === "ArrowRight") {
    showNextImage();
  }
});

if (lightbox) {
  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
}

document.querySelectorAll(".back-to-top").forEach(function (button) {
  button.addEventListener("click", function (event) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

initGalleryPage();
