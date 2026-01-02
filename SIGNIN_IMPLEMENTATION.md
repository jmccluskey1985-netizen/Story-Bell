# Story Bell Sign-In Implementation

## Overview

Story Bell uses a hybrid authentication system:
1. **Google Sign-In** - Firebase OAuth for Google accounts
2. **Email Sign-Up** - Simple localStorage-based collection (no verification required)

## How It Works

### Email Sign-Up Flow (No Verification)

1. User enters child's name + parent email on `/signin.html`
2. Data saved to `localStorage` as `storybell_user`:
   ```javascript
   {
     id: 'email_' + Date.now(),
     name: 'Child Name',
     email: 'parent@email.com',
     createdAt: timestamp
   }
   ```
3. Welcome email sent via EmailJS (if configured)
4. User redirected to homepage
5. Header updates to show child's name (capitalized)

### Google Sign-In Flow

1. User clicks Google button on `/signin.html`
2. Firebase OAuth redirect flow
3. On success, child profile saved to `localStorage` as `storybell_child_{uid}`
4. Header updates to show name

---

## Required Scripts (Copy These)

### 1. Hamburger Menu Script (REQUIRED for all pages)

Every page needs this script for mobile hamburger menu to work:

```html
<script id="sb-hamburger-menu">
// Hamburger Menu Toggle
(function () {
  const nav = document.querySelector(".header-right nav");
  const body = document.body;
  if (!nav) return;

  let toggleBtn = document.getElementById("menu-toggle");
  if (!toggleBtn) {
    const headerRight = document.querySelector(".header-right");
    if (headerRight) {
      toggleBtn = document.createElement("button");
      toggleBtn.id = "menu-toggle";
      toggleBtn.setAttribute("aria-label","Open menu");
      toggleBtn.textContent = "☰";
      toggleBtn.style.display = "none";
      headerRight.insertBefore(toggleBtn, headerRight.firstChild);
    }
  }

  let overlay = document.querySelector(".menu-overlay");
  if (!overlay) {
    const header = document.querySelector("header");
    overlay = document.createElement("div");
    overlay.className = "menu-overlay";
    if (header && header.parentNode) {
      header.parentNode.insertBefore(overlay, header.nextSibling);
    } else {
      document.body.appendChild(overlay);
    }
  }

  function openMenu() {
    nav.classList.add("open");
    body.classList.add("menu-open");
    overlay.classList.add("active");
  }
  function closeMenu() {
    nav.classList.remove("open");
    body.classList.remove("menu-open");
    overlay.classList.remove("active");
    nav.querySelectorAll("li.open").forEach(li => li.classList.remove("open"));
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (nav.classList.contains("open")) closeMenu(); else openMenu();
    });
  }
  overlay.addEventListener("click", (e) => { e.stopPropagation(); closeMenu(); });

  nav.querySelectorAll("ul > li > a").forEach(link => {
    link.addEventListener("click", function(e){
      if (window.matchMedia("(max-width: 900px)").matches && this.href && !this.href.endsWith("#")) {
        closeMenu();
      }
    });
  });
})();
</script>
```

### 2. Header Auth Script (REQUIRED for all pages)

This script handles showing/hiding login button and displaying username:

```html
<script id="sb-header-auth">
// Header Auth Update Functions
function getLocalUser() {
  try { return JSON.parse(localStorage.getItem('storybell_user') || 'null'); }
  catch(e) { return null; }
}
function getChildProfile(uid) {
  try { return JSON.parse(localStorage.getItem('storybell_child_' + uid) || 'null'); }
  catch(e) { return null; }
}
function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function updateHeaderAuth(firebaseUser) {
  var loginBtnDesktop = document.querySelector('.login-cta-header');
  var profileDesktop = document.querySelector('.sb-user-profile');
  var loginMobile = document.querySelector('.login-mobile');
  var profileMobile = document.querySelector('.login-mobile-profile');
  var nameMobile = document.querySelector('.sb-user-name-mobile');
  var localUser = getLocalUser();
  var isSignedIn = firebaseUser || localUser;
  if (isSignedIn) {
    var displayName;
    if (firebaseUser) {
      var profile = getChildProfile(firebaseUser.uid);
      displayName = (profile && profile.name) || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Reader');
    } else {
      displayName = localUser.name || (localUser.email ? localUser.email.split('@')[0] : 'Reader');
    }
    displayName = capitalizeFirst(displayName);
    if (loginBtnDesktop) loginBtnDesktop.style.display = 'none';
    if (profileDesktop) {
      profileDesktop.style.display = 'flex';
      var nameEl = profileDesktop.querySelector('.sb-user-name');
      if (nameEl) nameEl.textContent = displayName;
    }
    if (loginMobile) loginMobile.style.display = 'none';
    if (profileMobile) profileMobile.style.display = 'block';
    if (nameMobile) nameMobile.textContent = displayName;
    console.log('[SB] Header updated: showing', displayName);
  } else {
    if (loginBtnDesktop) loginBtnDesktop.style.display = '';
    if (profileDesktop) profileDesktop.style.display = 'none';
    if (loginMobile) loginMobile.style.display = '';
    if (profileMobile) profileMobile.style.display = 'none';
    console.log('[SB] Header updated: showing login button');
  }
}
window.signOutStoryBell = function(){
  localStorage.removeItem('storybell_user');
  localStorage.removeItem('storybell_simple_user');
  if (window.firebase && firebase.auth) {
    firebase.auth().signOut().then(function(){ window.location.href = '/'; }).catch(function(e){ console.error('[SB] Sign out error:', e); window.location.href = '/'; });
  } else {
    window.location.href = '/';
  }
};
// Check localStorage user immediately
(function checkLocalUser() {
  var localUser = getLocalUser();
  if (localUser) {
    console.log('[SB] Found localStorage user:', localUser.name || localUser.email);
    updateHeaderAuth(null);
  }
})();
// Firebase auth state listener
if (window.firebase && firebase.auth) {
  firebase.auth().onAuthStateChanged(function(u){
    console.log("[SB] Auth state:", u ? "SIGNED IN" : "SIGNED OUT");
    updateHeaderAuth(u);
  });
}
</script>
```

---

## Required HTML Elements

### Desktop Header Elements

```html
<!-- Login button (shown when logged out) - links directly to signin.html -->
<a class="login-cta-header" href="signin.html" style="margin-top: 14px; background: #FFEB3B; color: #003366; font-family: 'Coming Soon', cursive !important; font-size: 16px; font-weight: bold; border-radius: 20px; padding: 9px 22px 9px 32px; text-decoration: none; box-shadow: 0 2px 8px rgba(255,235,59,0.22); display: flex; align-items: center;">Log in/<br/>Create Account</a>

<!-- User Profile (shown when signed in) - Yellow button style, links to profile.html -->
<a href="profile.html" class="sb-user-profile" style="display:none; align-items:center; gap:8px; margin-top:14px; background:#FFEB3B; color:#003366; border-radius:20px; padding:8px 16px; text-decoration:none; box-shadow:0 2px 8px rgba(255,235,59,0.22);">
  <svg style="width:24px;height:24px;fill:#003366;" viewbox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
  </svg>
  <span class="sb-user-name" style="color:#003366; font-family:'Coming Soon',cursive; font-weight:bold; font-size:15px;"></span>
</a>
```

### Mobile Hamburger Menu Elements

These go inside the `<nav><ul>` in the hamburger menu:

```html
<!-- Login button (shown when logged out) -->
<li class="login-mobile">
  <a href="signin.html" style="background:#FFEB3B; color:#003366; font-weight:bold; border-radius:12px; text-decoration:none; display:block; padding:8px 14px; margin:6px 10px; text-align:left; white-space:nowrap;">Log in / Create Account</a>
</li>

<!-- Profile element (shown when logged in) - links to profile.html -->
<li class="login-mobile-profile" style="display:none;">
  <a href="profile.html" style="background:#FFEB3B; color:#003366; font-weight:bold; border-radius:12px; display:block; padding:8px 14px; margin:6px 10px; text-decoration:none;">
    <span class="sb-user-name-mobile" style="font-family:'Coming Soon',cursive; font-size:15px;"></span>
  </a>
</li>
```

---

## Mobile-Friendly Signin Page CSS

Add this CSS to signin.html for mobile responsiveness:

```html
<style>
/* Mobile-friendly signin styles */
.signin-container {
  max-width: 500px;
  margin: 20px auto;
  padding: 30px;
  box-sizing: border-box;
}
@media (max-width: 600px) {
  .signin-container {
    padding: 20px 15px;
    margin: 10px auto;
  }
  .signin-container h1 {
    font-size: 1.5em !important;
  }
  .signin-container input {
    max-width: 100% !important;
    width: 100% !important;
  }
  .signin-container button {
    width: 100% !important;
    max-width: 100% !important;
  }
  #firebaseui-auth-container {
    width: 100% !important;
  }
  #firebaseui-auth-container .firebaseui-idp-button {
    max-width: 100% !important;
  }
}
</style>
```

Then use the class on the container:
```html
<div class="main-blank signin-container">
  <h1>Sign In to Story Bell</h1>
  <!-- form content -->
</div>
```

---

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `storybell_user` | Email sign-up user data (name, email, id, createdAt, age) |
| `storybell_child_{uid}` | Firebase user's child profile (name, age, createdAt) |
| `storybell_simple_user` | Legacy key (cleared on sign out) |

---

## Profile Page (`profile.html`)

The profile page displays user information and provides account management.

### Features
- **Edit Name**: Click "Edit" button to change display name (saves to localStorage)
- **Age Selection**: Dropdown (3-12 years) with auto-save
- **Sign Out**: Clears session and redirects to homepage
- Mobile responsive design

### How It Works
1. On page load, checks for `storybell_user` (email signup) or Firebase user
2. Displays user name from profile data (capitalized)
3. **Edit Name**: Shows input field, saves new name to localStorage on confirm
4. Age selection saves to localStorage automatically
5. Sign Out clears localStorage and Firebase auth, redirects to homepage

### Accessing Profile
- **Desktop**: Click the yellow profile button (icon + name) in header
- **Mobile**: Tap the yellow profile button in hamburger menu

### Profile Button Style (Header)
When logged in, the header shows a **yellow button** with:
- Yellow background (#FFEB3B)
- Dark blue text and icon (#003366)
- Curved corners (border-radius: 20px)
- Profile icon + user's name
- Links to profile.html on click

---

## Auth Behavior Summary

### When Logged Out:
- Desktop: Shows yellow "Log in / Create Account" button
- Mobile hamburger: Shows yellow "Log in / Create Account" button
- Subscribe box: Visible on homepage

### When Logged In:
- Desktop: Hides login button, shows **yellow profile button** (icon + name) linking to profile.html
- Mobile hamburger: Hides login button, shows yellow profile button with name linking to profile.html
- Subscribe box: Hidden on homepage (user already signed up)

---

## Integration Checklist

For any new page to support authentication:

- [ ] Include Firebase SDK scripts in `<head>`
- [ ] Add hamburger menu script (`sb-hamburger-menu`)
- [ ] Add header auth script (`sb-header-auth`)
- [ ] Add desktop header elements (`.login-cta-header`, `.sb-user-profile`)
- [ ] Add mobile menu elements (`.login-mobile`, `.login-mobile-profile`)
- [ ] Ensure `.login-mobile-profile` comes immediately after `.login-mobile` in the HTML

---

## Files

| File | Purpose |
|------|---------|
| `signin.html` | Sign-up form, auth logic, mobile-friendly CSS |
| `profile.html` | User profile page (name, age, sign out) |
| `index.html` | Header auth display (reference implementation) |
| `story_bell_blank_norotate.html` | Template with all auth elements |
| `categories_storybell_local.py` | Auto-injects auth bindings on all pages |

---

## Troubleshooting

### Hamburger menu doesn't open on mobile
- Check that `sb-hamburger-menu` script is present
- Verify `.header-right nav` exists in the HTML
- Check browser console for JavaScript errors

### Login button not hiding when logged in
- Check that `sb-header-auth` script is present
- Verify `.login-mobile` and `.login-mobile-profile` elements exist
- Check localStorage for `storybell_user` key
- Check browser console for `[SB] Header updated:` logs

### Name not showing / showing as "Reader"
- Check that child's name was entered during signup
- Verify `storybell_user` in localStorage has `name` field
- The `capitalizeFirst()` function capitalizes the first letter

### Sign out not working
- Sign out is now only available on profile.html page
- Ensure `signOutStoryBell` is defined as `window.signOutStoryBell`
- Check that the Sign Out button on profile.html calls `signOutStoryBell()`

### Profile link not working
- Check that `.sb-user-profile` is an `<a>` element with `href="profile.html"`
- Check that `.login-mobile-profile` contains an `<a>` with `href="profile.html"`
- Verify profile.html exists in the content folder
