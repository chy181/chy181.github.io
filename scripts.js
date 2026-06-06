// Global variables
let allPublications = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Initialize animation delays for sections
  const sections = document.querySelectorAll('section');
  sections.forEach((section, index) => {
    section.style.animationDelay = `${index * 0.1}s`;
  });

  initializePreferenceControls();

  Promise.all([
    loadMarkdownContent(),
    loadPublications()
  ]).finally(() => {
    initializeVerticalNav();
    scrollToInitialHash();
  });
});

const i18nText = {
  en: {
    about: 'About',
    news: 'News',
    publications: 'Publications',
    services: 'Services',
    mobileLabels: {
      about: 'About',
      news: 'News',
      publications: 'Publications',
      services: 'Services',
      language: 'Language',
      theme: 'Theme'
    },
    newsHeading: 'News',
    publicationsHeading: 'Publications & Preprints',
    correspondingAuthorNote: '# Corresponding author.',
    servicesHeading: 'Academic Services',
    footerUpdated: 'Last updated: June 2026.',
    profileName: 'Hanyin Cheng',
    profileRole: 'PhD Student • East China Normal University',
    scholarLabel: 'Google Scholar',
    dblpLabel: 'DBLP',
    emailLabel: 'Email',
    githubLabel: 'GitHub',
    orcidLabel: 'ORCID',
    themeControlLabel: 'light/dark/system',
    viewing: 'Viewing',
    emailCopied: 'Email copied',
    copyFailed: 'Copy failed',
    switchedToEnglish: 'Switched to English',
    switchedToChinese: 'Switched to Chinese',
    themeToast: {
      system: 'Switched to system theme',
      light: 'Switched to light theme',
      dark: 'Switched to dark theme'
    }
  },
  zh: {
    about: '个人简介',
    news: '最新动态',
    publications: '发表论文',
    services: '学术服务',
    mobileLabels: {
      about: '简介',
      news: '动态',
      publications: '论文',
      services: '服务',
      language: '语言',
      theme: '主题'
    },
    newsHeading: '动态',
    publicationsHeading: '论文与预印本',
    correspondingAuthorNote: '# 通讯作者。',
    servicesHeading: '学术服务',
    footerUpdated: '最近更新：2026 年 6 月。',
    profileName: '成涵吟',
    profileRole: '博士生 • 华东师范大学',
    scholarLabel: '谷歌学术',
    dblpLabel: 'DBLP',
    emailLabel: '邮箱',
    githubLabel: 'GitHub',
    orcidLabel: 'ORCID',
    themeControlLabel: '浅色/深色/系统',
    viewing: '正在查看',
    emailCopied: '邮箱已复制',
    copyFailed: '复制失败',
    switchedToEnglish: 'Switched to English',
    switchedToChinese: '切换至 中文',
    themeToast: {
      system: '切换至 系统主题',
      light: '切换至 浅色主题',
      dark: '切换至 深色主题'
    }
  }
};

const themeModes = ['system', 'light', 'dark'];
const themeStorageKey = 'themePreference';

function initializePreferenceControls() {
  const savedLanguage = localStorage.getItem('languageMode') || 'en';
  const savedTheme = localStorage.getItem(themeStorageKey) || 'system';
  const languageToggle = document.querySelector('[data-language-toggle]');
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

  applyLanguage(savedLanguage);
  applyTheme(savedTheme);

  languageToggle?.addEventListener('click', () => {
    const nextLanguage = getCurrentLanguage() === 'en' ? 'zh' : 'en';
    localStorage.setItem('languageMode', nextLanguage);
    applyLanguage(nextLanguage);
    loadMarkdownContent();
    showToast(nextLanguage === 'zh' ? i18nText.zh.switchedToChinese : i18nText.en.switchedToEnglish, 'left');
  });

  themeToggle?.addEventListener('click', () => {
    const currentTheme = localStorage.getItem(themeStorageKey) || 'system';
    const nextTheme = themeModes[(themeModes.indexOf(currentTheme) + 1) % themeModes.length];
    localStorage.setItem(themeStorageKey, nextTheme);
    applyTheme(nextTheme);
    showToast(i18nText[getCurrentLanguage()].themeToast[nextTheme], 'left');
  });

  systemTheme.addEventListener('change', () => {
    if ((localStorage.getItem(themeStorageKey) || 'system') === 'system') {
      applyTheme('system');
    }
  });

  window.addEventListener('resize', () => applyLanguage(getCurrentLanguage()));
}

function getCurrentLanguage() {
  return document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
}

function applyLanguage(language) {
  const dictionary = i18nText[language] || i18nText.en;
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';

  document.querySelectorAll('.vertical-nav a[data-section]').forEach(link => {
    const label = link.querySelector('.nav-label');
    const labelText = isMobileNav() ? dictionary.mobileLabels[link.dataset.section] : dictionary[link.dataset.section];
    if (label && labelText) {
      label.textContent = labelText;
    }
  });

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.dataset.i18n;
    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });

  const themeLabel = document.querySelector('[data-theme-toggle] .nav-label');
  if (themeLabel) {
    themeLabel.textContent = isMobileNav() ? dictionary.mobileLabels.theme : dictionary.themeControlLabel;
  }

  const languageLabel = document.querySelector('[data-language-toggle] .nav-label');
  if (languageLabel) {
    languageLabel.textContent = isMobileNav() ? dictionary.mobileLabels.language : 'English/中文';
  }
}

function isMobileNav() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function applyTheme(themeMode) {
  const resolvedTheme = themeMode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : themeMode;
  document.documentElement.dataset.theme = resolvedTheme;
}

function copyEmailToClipboard(email, toastPlacement = 'right') {
  if (copyTextWithSelection(email)) {
    showToast(i18nText[getCurrentLanguage()].emailCopied, toastPlacement);
    return;
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(email)
      .then(() => showToast(i18nText[getCurrentLanguage()].emailCopied, toastPlacement))
      .catch(() => showToast(i18nText[getCurrentLanguage()].copyFailed, toastPlacement));
    return;
  }

  showToast(i18nText[getCurrentLanguage()].copyFailed, toastPlacement);
}

function copyTextWithSelection(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch (error) {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

function showToast(message, placement = 'right') {
  let toast = document.querySelector('.copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove('is-visible');
  toast.classList.add('is-preparing');
  positionToast(toast, placement);
  toast.offsetHeight;
  toast.classList.remove('is-preparing');
  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });
  clearTimeout(showToast.hideTimer);
  showToast.hideTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 1500);
}

function positionToast(toast, placement) {
  toast.classList.remove('is-positioned');
  toast.style.top = '';
  toast.style.right = '';
  toast.style.bottom = '';
  toast.style.left = '';

  if (isMobileNav()) {
    return;
  }

  const nav = document.querySelector(placement === 'left' ? '.vertical-nav' : '.external-nav');
  if (!nav || getComputedStyle(nav).display === 'none') {
    return;
  }

  const rect = nav.getBoundingClientRect();
  toast.classList.add('is-positioned');
  toast.style.top = `${rect.bottom + 12}px`;
  toast.style.left = `${rect.left + rect.width / 2}px`;
}

function loadMarkdownContent() {
  const targets = Array.from(document.querySelectorAll('[data-markdown]'));

  return Promise.all(targets.map(target => {
    const markdownPath = getLocalizedMarkdownPath(target.dataset.markdown);
    return fetch(`${markdownPath}?v=20260605a`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Could not load ${markdownPath}: ${response.status}`);
        }
        return response.text();
      })
      .then(markdown => {
        target.innerHTML = renderMarkdown(markdown);
        if (target.id === 'news-content') {
          const list = target.querySelector('ul');
          if (list) {
            list.classList.add('news-list');
          }
        }
      })
      .catch(error => {
        console.error(error);
        target.textContent = `Error loading ${markdownPath}.`;
      });
  }));
}

function getLocalizedMarkdownPath(markdownPath) {
  if (getCurrentLanguage() === 'zh') {
    return markdownPath.replace(/\.md$/, '.zh.md');
  }

  return markdownPath;
}

function renderMarkdown(markdown) {
  const blocks = markdown.replace(/\r\n/g, '\n').trim().split(/\n\s*\n/);

  return blocks.map(block => {
    const lines = block.split('\n');

    if (lines.every(line => line.trim().startsWith('- '))) {
      const items = lines.map(line => `<li>${renderInlineMarkdown(line.trim().slice(2))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }

    if (lines[0].startsWith('## ')) {
      return `<h2>${renderInlineMarkdown(lines[0].slice(3).trim())}</h2>`;
    }

    if (block.trim().startsWith('<')) {
      return block;
    }

    return `<p>${renderInlineMarkdown(lines.join(' ').trim())}</p>`;
  }).join('\n');
}

function renderInlineMarkdown(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, (_, label, href) => `<a href="${href}">${label.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

// Load publications from JSON file
function loadPublications() {
  return fetch('content/publications.json?v=20260606a')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Publications loaded successfully:", data);
      allPublications = data.publications;
      renderPublications(false);
    })
    .catch(error => {
      console.error('Error loading publications:', error);
      // Create fallback publications display if JSON loading fails
      displayFallbackPublications();
    });
}

// Fallback if JSON loading fails
function displayFallbackPublications() {
  const container = document.getElementById('publications-container');
  container.innerHTML = `Error loading publications.`;
}

// Render publications based on selection state
function renderPublications(selectedOnly) {
  const publicationsContainer = document.getElementById('publications-container');
  publicationsContainer.innerHTML = '';
  
  const pubsToShow = selectedOnly ? 
    allPublications.filter(pub => pub.selected === 1) : 
    allPublications;
  
  pubsToShow.forEach(publication => {
    const pubElement = createPublicationElement(publication);
    publicationsContainer.appendChild(pubElement);
  });
}

function initializeVerticalNav() {
  const navLinks = Array.from(document.querySelectorAll('.vertical-nav a[data-section]'));
  const sections = navLinks
    .map(link => document.getElementById(link.dataset.section))
    .filter(Boolean);

  if (!navLinks.length || !sections.length) {
    return;
  }

  const setActive = sectionId => {
    navLinks.forEach(link => {
      link.classList.toggle('is-active', link.dataset.section === sectionId);
    });
  };

  setActive(sections[0].id);
  let lockedSectionId = null;
  let scrollUnlockFrame = null;

  navLinks.forEach(link => {
    link.addEventListener('click', event => {
      const target = document.getElementById(link.dataset.target || link.dataset.section);
      if (!target) {
        return;
      }

      event.preventDefault();
      lockedSectionId = link.dataset.section;
      cancelAnimationFrame(scrollUnlockFrame);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(lockedSectionId);
      showToast(`${i18nText[getCurrentLanguage()].viewing} ${link.querySelector('.nav-label')?.textContent || link.dataset.section}`, 'left');
      history.replaceState(null, '', link.getAttribute('href'));
      waitForScrollToSettle(target);
    });
  });

  const isTargetReached = target => {
    if (target.id === 'top') {
      return window.scrollY <= 2;
    }

    const targetTop = target.getBoundingClientRect().top;
    const isAtPageBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    return Math.abs(targetTop) <= 8 || isAtPageBottom;
  };

  const waitForScrollToSettle = target => {
    let lastScrollY = window.scrollY;
    let stableFrames = 0;
    const startedAt = performance.now();

    const check = () => {
      const currentScrollY = window.scrollY;
      const isStable = Math.abs(currentScrollY - lastScrollY) < 1;
      stableFrames = isStable ? stableFrames + 1 : 0;
      lastScrollY = currentScrollY;

      if ((isTargetReached(target) && stableFrames >= 2) || performance.now() - startedAt > 1200) {
        lockedSectionId = null;
        updateActiveFromScroll();
        return;
      }

      scrollUnlockFrame = requestAnimationFrame(check);
    };

    scrollUnlockFrame = requestAnimationFrame(check);
  };

  const updateActiveFromScroll = () => {
    if (lockedSectionId) {
      setActive(lockedSectionId);
      return;
    }

    const isNearPageBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 16;
    if (isNearPageBottom) {
      setActive(sections[sections.length - 1].id);
      return;
    }

    const anchorLine = isMobileNav()
      ? Math.min(window.innerHeight * 0.45, window.innerHeight - 130)
      : Math.min(window.innerHeight * 0.35, 260);
    let current = sections[0];

    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= anchorLine) {
        current = section;
      }
    });

    setActive(current.id);
  };

  updateActiveFromScroll();
  window.addEventListener('scroll', updateActiveFromScroll, { passive: true });
  window.addEventListener('resize', updateActiveFromScroll);
}

function scrollToInitialHash() {
  if (!window.location.hash) {
    return;
  }

  const target = document.getElementById(window.location.hash.slice(1));
  if (target) {
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start' });
    });
  }
}

// Create HTML element for a publication
function createPublicationElement(publication) {
  const pubItem = document.createElement('div');
  pubItem.className = 'publication-item';
  
  // Create thumbnail
  const thumbnail = document.createElement('div');
  thumbnail.className = 'pub-thumbnail';
  thumbnail.onclick = () => openModal(publication.thumbnail);
  
  const thumbnailImg = document.createElement('img');
  thumbnailImg.src = publication.thumbnail;
  thumbnailImg.alt = `${publication.title} thumbnail`;
  thumbnail.appendChild(thumbnailImg);

  if (publication.badge) {
    const badge = document.createElement('div');
    badge.className = 'pub-badge';
    badge.textContent = publication.badge;
    thumbnail.appendChild(badge);
  }
  
  // Create content container
  const content = document.createElement('div');
  content.className = 'pub-content';
  
  // Add title
  const title = document.createElement('div');
  title.className = 'pub-title';

  if (publication.icon) {
    const iconConfig = typeof publication.icon === 'string' ? { src: publication.icon } : publication.icon;
    const icon = document.createElement('img');
    icon.className = 'pub-title-icon';
    icon.src = iconConfig.src;
    icon.alt = '';
    if (iconConfig.width) {
      icon.style.width = iconConfig.width;
    }
    if (iconConfig.height) {
      icon.style.height = iconConfig.height;
    }
    title.appendChild(icon);
  }

  const titleText = document.createElement('span');
  titleText.textContent = publication.title;
  title.appendChild(titleText);
  content.appendChild(title);
  
  // Add authors and venue in one metadata line
  const meta = document.createElement('div');
  meta.className = 'pub-meta';

  const authors = document.createElement('span');
  authors.className = 'pub-authors';

  publication.authors.forEach((author, index) => {
    const isCorresponding = author.includes('#');
    const cleanAuthor = author.replace(/#/g, '').trim();
    const authorSpan = document.createElement('span');
    if (cleanAuthor.includes('Hanyin Cheng') || cleanAuthor.includes('HanYin Cheng') || cleanAuthor.includes('H Cheng')) {
      authorSpan.className = 'highlight-name';
    }
    authorSpan.textContent = cleanAuthor;
    authors.appendChild(authorSpan);

    if (isCorresponding) {
      const marker = document.createElement('sup');
      marker.className = 'corresponding-marker';
      marker.textContent = '#';
      authors.appendChild(marker);
    }

    if (index < publication.authors.length - 1) {
      authors.appendChild(document.createTextNode(', '));
    }
  });
  meta.appendChild(authors);

  const separator = document.createElement('span');
  separator.className = 'pub-meta-separator';
  separator.textContent = '·';
  meta.appendChild(separator);

  const venue = document.createElement('span');
  venue.className = 'pub-venue';
  const venueMatch = publication.venue.match(/\s*\((CCF-[AB]|CORE A\*)\)$/);
  venue.textContent = venueMatch ? publication.venue.replace(/\s*\((CCF-[AB]|CORE A\*)\)$/, '') : publication.venue;
  meta.appendChild(venue);

  if (venueMatch) {
    const ccfBadge = document.createElement('span');
    ccfBadge.className = `ccf-badge ${venueMatch[1] === 'CCF-B' ? 'ccf-b' : 'ccf-a'}`;
    ccfBadge.textContent = venueMatch[1];
    meta.appendChild(ccfBadge);
  }
  content.appendChild(meta);

  // Add award if it exists
  if (publication.award && publication.award.length > 0) {
    const award = document.createElement('div');
    award.className = 'pub-award';
    award.textContent = publication.award;
    content.appendChild(award);
  }
  
  // Add links if they exist
  if (publication.links) {
    const links = document.createElement('div');
    links.className = 'pub-links';
    
    if (publication.links.pdf) {
      const pdfLink = document.createElement('a');
      pdfLink.href = publication.links.pdf;
      pdfLink.textContent = '[PDF]';
      links.appendChild(pdfLink);
    }

    if (publication.links.code) {
      const codeLink = document.createElement('a');
      codeLink.href = publication.links.code;
      codeLink.textContent = '[Code]';
      links.appendChild(codeLink);
    }

    if (publication.links.alphaxiv) {
      const alphaxivLink = document.createElement('a');
      alphaxivLink.href = publication.links.alphaxiv;
      alphaxivLink.textContent = '[Chat on it]';
      links.appendChild(alphaxivLink);
    }
    
    if (publication.links.project) {
      const projectLink = document.createElement('a');
      projectLink.href = publication.links.project;
      projectLink.textContent = '[Project Page]';
      links.appendChild(projectLink);
    }

    if (publication.links.scholar) {
      const scholarLink = document.createElement('a');
      scholarLink.href = publication.links.scholar;
      scholarLink.textContent = '[Scholar]';
      links.appendChild(scholarLink);
    }

    const bibtexButton = document.createElement('button');
    bibtexButton.type = 'button';
    bibtexButton.className = 'bibtex-button';
    bibtexButton.textContent = '[BibTeX]';
    bibtexButton.addEventListener('click', () => {
      const copied = copyTextWithSelection(generateBibTeX(publication));
      showBibTeXButtonState(bibtexButton, copied ? '[BibTeX Copied]' : '[Copy Failed]');
    });
    links.appendChild(bibtexButton);
    
    content.appendChild(links);
  }
  
  // Assemble the publication item
  pubItem.appendChild(thumbnail);
  pubItem.appendChild(content);
  
  return pubItem;
}

function generateBibTeX(publication) {
  const yearMatch = publication.venue.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : '2026';
  const firstAuthor = publication.authors[0]
    .replace(/\*/g, '')
    .trim()
    .split(/\s+/)
    .slice(-1)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const titleWord = publication.title
    .split(/[\s:]+/)
    .find(word => /^[A-Za-z0-9]+$/.test(word)) || 'paper';
  const key = `${firstAuthor}${year}${titleWord.toLowerCase()}`;
  const venue = publication.venue.replace(/\s*\((CCF-[AB]|CORE A\*)\)$/, '');

  return `@inproceedings{${key},
  title={${publication.title}},
  author={${publication.authors.map(author => author.replace(/\*/g, '').trim()).join(' and ')}},
  booktitle={${venue}},
  year={${year}}
}`;
}

function showBibTeXButtonState(button, message) {
  button.textContent = message;
  button.classList.add('is-copied');
  clearTimeout(button.copyNoticeTimer);
  button.copyNoticeTimer = setTimeout(() => {
    button.textContent = '[BibTeX]';
    button.classList.remove('is-copied');
  }, 1500);
}

// Modal functionality for viewing original images
function openModal(imageSrc) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  modal.style.display = "block";
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
  modalImg.src = imageSrc;
}

function closeModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

// Close modal when clicking outside the image
window.onclick = function(event) {
  const modal = document.getElementById('imageModal');
  if (event.target == modal) {
    closeModal();
  }
}
