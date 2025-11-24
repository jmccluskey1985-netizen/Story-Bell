# Stories.json Standardization - Changes Documentation

**Date:** November 24, 2025
**Location:** /home/jmccl/colab-storybell/content/

---

## Overview

This document details all changes made to standardize the file naming conventions and URL structure for the Story Bell website content.

---

## Summary of Changes

### 1. Standardized Slug Format
- **Changed from:** Underscores (mayas_missing_mittens)
- **Changed to:** Hyphens (mayas-missing-mittens)
- **Count:** 15 slugs updated

### 2. Updated Image Paths
- **Old format:** Various formats
- **New format:** icon/{slug}-imagetitle.webp
- **Count:** 15 image paths updated

### 3. Updated Audio Paths
- **Old format:** {Title_With_Underscores}/{Title_With_Underscores}_StoryAudio.mp3
- **New format:** {slug}/{slug}-audio.mp3
- **Count:** 15 audio paths updated

### 4. Updated HTML File Paths
- **Old format:** {Title_With_Underscores}.html
- **New format:** {slug}.html
- **Count:** 15 HTML paths updated

### 5. Updated All URLs
- **Old domain:** story-bell.com
- **New domain:** storybellkids.com
- **Count:** 120 URLs updated across all stories

---

## File Structure Changes

### Image Files Renamed (15 Files)
All images in icon/ directory renamed to format: {slug}-imagetitle.webp

### Story Directories Created (14 New)
All directories use lowercase hyphenated slug format

### HTML Files
- Removed 2 duplicate files (lunas-colorful-garden2.html, owl-in-the-dark-forest2.html)
- 12/15 existing files already correctly named
- 3 files missing and need creation

---

## Current Status

### Completed
- 15 slugs standardized
- 15 image paths updated
- 15 image files renamed
- 15 audio paths updated
- 15 HTML paths updated
- 15 story directories created
- 120 URLs updated to storybellkids.com
- 2 duplicate HTML files removed
- stories.json backup created

### Pending
- 14 audio files need to be added
- 3 HTML files need creation

---

## Standardized Naming Convention

Slug:     {slug}
HTML:     {slug}.html
Image:    icon/{slug}-imagetitle.webp
Audio:    {slug}/{slug}-audio.mp3
URL:      https://storybellkids.com/{slug}.html

---

## Backup Information

**Backup:** stories.json.backup_20251124_221255
**Location:** /home/jmccl/colab-storybell/content/

**Last Updated:** November 24, 2025
