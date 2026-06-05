// Global variables
let allPublications = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Initialize animation delays for sections
  const sections = document.querySelectorAll('section');
  sections.forEach((section, index) => {
    section.style.animationDelay = `${index * 0.1}s`;
  });

  Promise.all([
    loadMarkdownContent(),
    loadPublications()
  ]).finally(() => {
    initializeVerticalNav();
    scrollToInitialHash();
  });
});

function loadMarkdownContent() {
  const targets = Array.from(document.querySelectorAll('[data-markdown]'));

  return Promise.all(targets.map(target => {
    return fetch(`${target.dataset.markdown}?v=20260604b`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Could not load ${target.dataset.markdown}: ${response.status}`);
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
        target.textContent = `Error loading ${target.dataset.markdown}.`;
      });
  }));
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
  return fetch('content/publications.json?v=20260604c')
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
  let unlockTimer = null;

  navLinks.forEach(link => {
    link.addEventListener('click', event => {
      const target = document.getElementById(link.dataset.target || link.dataset.section);
      if (!target) {
        return;
      }

      event.preventDefault();
      lockedSectionId = link.dataset.section;
      clearTimeout(unlockTimer);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(lockedSectionId);
      history.replaceState(null, '', link.getAttribute('href'));

      unlockTimer = setTimeout(() => {
        lockedSectionId = null;
        updateActiveFromScroll();
      }, 800);
    });
  });

  const updateActiveFromScroll = () => {
    if (lockedSectionId) {
      setActive(lockedSectionId);
      const target = document.getElementById(lockedSectionId);
      if (target && Math.abs(target.getBoundingClientRect().top) < 8) {
        lockedSectionId = null;
      } else {
        return;
      }
    }

    const isNearPageBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 16;
    if (isNearPageBottom) {
      setActive(sections[sections.length - 1].id);
      return;
    }

    const anchorLine = window.scrollY + Math.min(window.innerHeight * 0.35, 260);
    let current = sections[0];

    sections.forEach(section => {
      if (section.offsetTop <= anchorLine) {
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
  
  // Add authors with highlight
  const authors = document.createElement('div');
  authors.className = 'pub-authors';
  
  // Format authors with highlighting
  let authorsHTML = '';
  publication.authors.forEach((author, index) => {
    if (author.includes('Hanyin Cheng') || author.includes('HanYin Cheng') || author.includes('H Cheng')) {
      authorsHTML += `<span class="highlight-name">${author}</span>`;
    } else {
      authorsHTML += author;
    }
    
    if (index < publication.authors.length - 1) {
      authorsHTML += ', ';
    }
  });
  
  authors.innerHTML = authorsHTML;
  content.appendChild(authors);
  
  // Add venue with award if present
  const venueContainer = document.createElement('div');
  venueContainer.className = 'pub-venue-container';
  
  const venue = document.createElement('div');
  venue.className = 'pub-venue';
  venue.textContent = publication.venue;
  venueContainer.appendChild(venue);
  
  // Add award if it exists
  if (publication.award && publication.award.length > 0) {
    const award = document.createElement('div');
    award.className = 'pub-award';
    award.textContent = publication.award;
    venueContainer.appendChild(award);
  }
  
  content.appendChild(venueContainer);
  
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
    
    content.appendChild(links);
  }
  
  // Assemble the publication item
  pubItem.appendChild(thumbnail);
  pubItem.appendChild(content);
  
  return pubItem;
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
