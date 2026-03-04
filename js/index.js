const toggleButton = document.querySelector('#ToggleMenu');
const mobileMenu = document.querySelector('#menuMobile');

if (toggleButton && mobileMenu) {
    toggleButton.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.toggle('is-open');
        toggleButton.setAttribute('aria-expanded', String(isOpen));
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('is-open');
            toggleButton.setAttribute('aria-expanded', 'false');
        });
    });
}

const galleryGrid = document.querySelector('#galleryGrid');
const GALLERY_EXTENSIONS = /\.(avif|webp|jpe?g|png|gif)$/i;
const GALLERY_MANIFEST_FILE = 'img/gallery/gallery-manifest.js';

function setGalleryStatus(container, message) {
    const status = document.createElement('p');
    status.className = 'gallery-status';
    status.textContent = message;
    container.replaceChildren(status);
}

function normalizeGalleryPath(path) {
    if (!path) {
        return 'img/gallery/';
    }
    return path.endsWith('/') ? path : `${path}/`;
}

function createAltText(fileName, index) {
    const cleanName = fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleanName) {
        return `Imagen de galería ${index + 1}`;
    }

    return `Galería ${cleanName}`;
}

function getGalleryFileNamesFromManifest() {
    const manifest = window.GALLERY_MANIFEST;

    if (!Array.isArray(manifest)) {
        return [];
    }

    const files = new Set();

    manifest.forEach((item) => {
        if (typeof item !== 'string') {
            return;
        }

        const fileName = decodeURIComponent(item.split('/').pop() || '').trim();

        if (!fileName || !GALLERY_EXTENSIONS.test(fileName)) {
            return;
        }

        files.add(fileName);
    });

    const sortedFiles = [...files];
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    sortedFiles.sort((a, b) => collator.compare(a, b));

    return sortedFiles;
}

function loadGalleryManifestScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${GALLERY_MANIFEST_FILE}?t=${Date.now()}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('No se pudo cargar gallery-manifest.js'));
        document.head.appendChild(script);
    });
}

function renderGallery(container, galleryPath, galleryThumbPath, fileNames) {
    const fragment = document.createDocumentFragment();

    fileNames.forEach((fileName, index) => {
        const item = document.createElement('figure');
        item.className = 'gallery-item';

        const image = document.createElement('img');
        const encodedName = encodeURIComponent(fileName);
        const fullSrc = `${galleryPath}${encodedName}`;
        const thumbSrc = `${galleryThumbPath}${encodedName}`;

        image.src = thumbSrc;
        image.alt = createAltText(fileName, index);
        image.decoding = 'async';
        image.loading = 'lazy';
        image.fetchPriority = 'low';
        image.width = 640;
        image.height = 480;
        image.srcset = `${thumbSrc} 640w, ${fullSrc} 1200w`;
        image.sizes = '(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw';

        image.onerror = () => {
            if (image.src !== fullSrc) {
                image.src = fullSrc;
                image.onerror = null;
            }
        };

        item.appendChild(image);
        fragment.appendChild(item);
    });

    container.replaceChildren(fragment);
}

async function initGallery() {
    if (!galleryGrid) {
        return;
    }

    const galleryPath = normalizeGalleryPath(galleryGrid.dataset.galleryPath);
    const galleryThumbPath = normalizeGalleryPath(
        galleryGrid.dataset.galleryThumbPath || `${galleryPath}thumbs/`
    );

    try {
        await loadGalleryManifestScript();
    } catch {
        setGalleryStatus(
            galleryGrid,
            'No se encontró el manifest de galería. Ejecuta scripts/update-gallery-manifest.ps1.'
        );
        return;
    }

    const files = getGalleryFileNamesFromManifest();

    if (!files.length) {
        setGalleryStatus(
            galleryGrid,
            'No se encontraron imágenes en el manifest de galería. Ejecuta el script de actualización de manifest.'
        );
        return;
    }

    renderGallery(galleryGrid, galleryPath, galleryThumbPath, files);
}

if (window.requestIdleCallback) {
    window.requestIdleCallback(initGallery, { timeout: 1200 });
} else {
    window.setTimeout(initGallery, 0);
}
