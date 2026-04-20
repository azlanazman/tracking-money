// ══════════════════════════════════════════════════════
//  auth.js — Lumina Financial
//  Firebase initialisation, auth state, and auth UI
//  Depends on: app.js (loaded before this file)
//  Calls initDB() and sets db/auth/currentUser globals
//  defined in app.js
// ══════════════════════════════════════════════════════

// ── Firebase init & auth state ───────────────────────

function initFirebase(){
  try{ firebase.initializeApp(FIREBASE_CONFIG); }catch(e){}
  db   = firebase.firestore();
  auth = firebase.auth();

  // Auth state observer — the single source of truth for show/hide
  auth.onAuthStateChanged(user=>{
    if(user){
      currentUser=user;
      showApp(user);
      initDB();
    } else {
      currentUser=null;
      showAuthWall();
    }
  });
}

function showApp(user){
  document.getElementById('auth-wall').style.display='none';
  document.getElementById('app-shell').style.display='block';
  // Populate avatar + tooltip with user initials / display name
  const name=user.displayName||user.email||'';
  const initials=name.split(/\s+|@/).filter(Boolean).map(w=>w[0].toUpperCase()).slice(0,2).join('');
  const av=document.getElementById('top-avatar');
  av.textContent=initials||'U';
  av.title=user.email||'';
}

function showAuthWall(){
  document.getElementById('auth-wall').style.display='flex';
  document.getElementById('app-shell').style.display='none';
}

// ── Auth UI ───────────────────────────────────────────
let authMode='signin'; // 'signin' | 'signup'

function authTab(mode){
  authMode=mode;
  const isSU=(mode==='signup');
  document.getElementById('tab-signin').className=!isSU
    ?'flex-1 py-2 rounded-lg text-sm font-semibold bg-white text-primary shadow-sm transition-all'
    :'flex-1 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-700 transition-all';
  document.getElementById('tab-signup').className=isSU
    ?'flex-1 py-2 rounded-lg text-sm font-semibold bg-white text-primary shadow-sm transition-all'
    :'flex-1 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-700 transition-all';
  document.getElementById('auth-confirm-wrap').classList.toggle('hidden',!isSU);
  document.getElementById('auth-forgot-row').classList.toggle('hidden',isSU);
  document.getElementById('auth-submit-btn').textContent=isSU?'Create Account':'Sign In';
  document.getElementById('auth-password').autocomplete=isSU?'new-password':'current-password';
  clearAuthError();
}

function showAuthError(msg){
  const el=document.getElementById('auth-error');
  el.textContent=msg; el.classList.add('show');
}
function clearAuthError(){
  const el=document.getElementById('auth-error');
  el.textContent=''; el.classList.remove('show');
  ['auth-email','auth-password','auth-confirm'].forEach(id=>{
    document.getElementById(id)?.classList.remove('error');
  });
}

async function handleEmailAuth(e){
  e.preventDefault();
  clearAuthError();
  const email=document.getElementById('auth-email').value.trim();
  const pw   =document.getElementById('auth-password').value;
  const btn  =document.getElementById('auth-submit-btn');

  if(!email){ showAuthError('Please enter your email address.'); document.getElementById('auth-email').classList.add('error'); return; }
  if(pw.length<6){ showAuthError('Password must be at least 6 characters.'); document.getElementById('auth-password').classList.add('error'); return; }

  if(authMode==='signup'){
    const pw2=document.getElementById('auth-confirm').value;
    if(pw!==pw2){ showAuthError('Passwords do not match.'); document.getElementById('auth-confirm').classList.add('error'); return; }
  }

  btn.disabled=true;
  btn.textContent=authMode==='signup'?'Creating account…':'Signing in…';

  try{
    if(authMode==='signup'){
      await auth.createUserWithEmailAndPassword(email,pw);
    } else {
      await auth.signInWithEmailAndPassword(email,pw);
    }
    // onAuthStateChanged will handle showing the app
  } catch(err){
    btn.disabled=false;
    btn.textContent=authMode==='signup'?'Create Account':'Sign In';
    const msgs={
      'auth/user-not-found':'No account found with this email.',
      'auth/wrong-password':'Incorrect password. Please try again.',
      'auth/invalid-email':'Please enter a valid email address.',
      'auth/email-already-in-use':'An account already exists with this email.',
      'auth/weak-password':'Password must be at least 6 characters.',
      'auth/too-many-requests':'Too many attempts. Please wait a moment and try again.',
      'auth/invalid-credential':'Incorrect email or password.',
    };
    showAuthError(msgs[err.code]||'Sign in failed. Please try again.');
    document.getElementById('auth-email').classList.add('error');
    document.getElementById('auth-password').classList.add('error');
  }
}

async function handleGoogleAuth(){
  clearAuthError();
  const btn=document.getElementById('google-btn');
  const originalHTML=btn.innerHTML;

  // Loading state
  btn.classList.add('loading');
  btn.innerHTML=`<svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#c7c4d8" stroke-width="3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="#3525cd" stroke-width="3" stroke-linecap="round"/>
  </svg><span>Connecting…</span>`;

  try{
    const provider=new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});
    await auth.signInWithPopup(provider);
    // onAuthStateChanged handles the rest — no need to restore button
  } catch(err){
    // Restore button
    btn.classList.remove('loading');
    btn.innerHTML=originalHTML;

    // Silent dismiss — user closed popup intentionally
    if(err.code==='auth/popup-closed-by-user'||err.code==='auth/cancelled-popup-request') return;

    // Domain not authorised in Firebase Console
    if(err.code==='auth/unauthorized-domain'){
      showAuthError('This domain is not authorised for Google sign-in. Add it in Firebase Console → Authentication → Settings → Authorised domains.');
      return;
    }

    // Popup was blocked by the browser
    if(err.code==='auth/popup-blocked'){
      showAuthError('Popup was blocked by your browser. Please allow popups for this site and try again.');
      return;
    }

    const googleErrs={
      'auth/network-request-failed':'Network error — check your connection and try again.',
      'auth/internal-error':'An internal error occurred. Please try again.',
      'auth/operation-not-allowed':'Google sign-in is not enabled. Please contact support.',
      'auth/account-exists-with-different-credential':'An account already exists with this email using a different sign-in method.',
    };
    showAuthError(googleErrs[err.code]||`Google sign-in failed (${err.code||'unknown error'}). Please try again.`);
  }
}

async function handleForgotPassword(){
  clearAuthError();
  const email=document.getElementById('auth-email').value.trim();
  if(!email){ showAuthError('Enter your email address first, then click Forgot password.'); document.getElementById('auth-email').classList.add('error'); return; }
  try{
    await auth.sendPasswordResetEmail(email);
    const msg=document.getElementById('auth-reset-msg');
    msg.textContent='Reset email sent — check your inbox.';
    msg.classList.remove('hidden');
    setTimeout(()=>msg.classList.add('hidden'),5000);
  } catch(err){
    showAuthError('Could not send reset email. Check the address and try again.');
  }
}

async function signOut(){
  if(!confirm('Sign out of Lumina?')) return;
  // Reset in-memory state declared in app.js before Firebase clears the session
  txs=[]; budgets={}; goals=[]; alerts=[]; uref=null; DEMO_MODE=false;
  if(auth) await auth.signOut();
  // onAuthStateChanged will show the auth wall
}
