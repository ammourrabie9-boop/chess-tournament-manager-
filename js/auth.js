/* =====================================================
   CHESS TOURNAMENT MANAGER
   AUTHENTICATION
   LOGIN + REGISTER + GUEST MODE + PASSWORD RESET
   EMAIL CONFIRMATION REDIRECT
===================================================== */
 
"use strict";
 
/* The live website is hosted on Netlify. Keep this URL in sync with Supabase
   Authentication > URL Configuration > Site URL / Redirect URLs. */
const CHESS_SITE_BASE =
    "https://chess-tournament-manager-ammour.netlify.app/pages/";
 
const GUEST_MODE_KEY = "chessTournamentManager_guestMode";
const RESET_COOLDOWN_PREFIX = "chessTournamentManager_resetCooldown_";
let passwordRecoveryReady = false;
let resetCooldownInterval = null;
 
/* =====================================================
   INITIALIZATION
===================================================== */
 
document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) loginForm.addEventListener("submit", handleLogin);
 
    const registerForm = document.getElementById("registerForm");
    if (registerForm) registerForm.addEventListener("submit", handleRegister);
 
    const guestButton = document.getElementById("guestButton");
    if (guestButton) guestButton.addEventListener("click", handleGuestLogin);
 
    const forgotPasswordForm = document.getElementById("forgotPasswordForm");
    if (forgotPasswordForm) forgotPasswordForm.addEventListener("submit", handleForgotPassword);
 
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    if (resetPasswordForm) initializePasswordReset(resetPasswordForm);
 
    initializeEmailConfirmation();
});
 
/* =====================================================
   HELPERS
===================================================== */
 
function isSupabaseReady(message) {
    if (!window.supabaseClient || !window.supabaseClient.auth) {
        setAuthMessage(message,
            "Supabase connection is not available. Please try again later.",
            "error");
        console.error("Supabase client is not available.");
        return false;
    }
    return true;
}
 
function setAuthMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = "auth-message " + (type || "");
}
 
function clearAccountMarkers() {
    [localStorage, sessionStorage].forEach(storage => {
        storage.removeItem("userEmail");
        storage.removeItem("loggedInEmail");
        storage.removeItem("currentUserEmail");
        storage.removeItem("accountEmail");
        storage.removeItem(GUEST_MODE_KEY);
    });
}
 
/* =====================================================
   GUEST MODE
===================================================== */
 
async function handleGuestLogin() {
    // Clear any previous Supabase session so guest mode cannot reuse an account.
    if (window.supabaseClient && window.supabaseClient.auth) {
        try {
            await window.supabaseClient.auth.signOut();
        } catch (error) {
            console.warn("Could not clear previous Supabase session:", error);
        }
    }
 
    [localStorage, sessionStorage].forEach(storage => {
        storage.removeItem("userEmail");
        storage.removeItem("loggedInEmail");
        storage.removeItem("currentUserEmail");
        storage.removeItem("accountEmail");
        storage.setItem(GUEST_MODE_KEY, "true");
    });
 
    window.location.href = "./dashboard.html";
}
 
/* =====================================================
   LOGIN
===================================================== */
 
async function handleLogin(event) {
    event.preventDefault();
 
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");
    const button = document.getElementById("loginButton") ||
        document.querySelector("#loginForm button[type='submit']");
 
    if (!emailInput || !passwordInput || !message || !button) {
        console.error("Login form elements are missing.");
        return;
    }
 
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    setAuthMessage(message, "", "");
 
    if (!email || !password) {
        setAuthMessage(message, "Please enter your email and password.", "error");
        return;
    }
    if (!isSupabaseReady(message)) return;
 
    button.disabled = true;
    const originalButtonText = button.textContent;
    button.textContent = "Logging in...";
 
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data || !data.user || !data.session) {
            throw new Error("Login completed without an active session.");
        }
 
        [localStorage, sessionStorage].forEach(storage => {
            storage.removeItem(GUEST_MODE_KEY);
            storage.setItem("userEmail", data.user.email || email);
        });
 
        setAuthMessage(message, "Login successful. Redirecting...", "success");
        window.location.href = "./dashboard.html";
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        setAuthMessage(message, getAuthErrorMessage(error), "error");
        button.disabled = false;
        button.textContent = originalButtonText || "Login";
    }
}
 
/* =====================================================
   REGISTER
===================================================== */
 
async function handleRegister(event) {
    event.preventDefault();
 
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const confirmInput = document.getElementById("confirmPassword");
    const message = document.getElementById("registerMessage");
    const button = document.getElementById("registerButton") ||
        document.querySelector("#registerForm button[type='submit']");
 
    if (!emailInput || !passwordInput || !confirmInput || !message || !button) {
        console.error("Registration form elements are missing.");
        return;
    }
 
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;
    setAuthMessage(message, "", "");
 
    if (!email) {
        setAuthMessage(message, "Please enter your email.", "error");
        return;
    }
    if (password.length < 6) {
        setAuthMessage(message, "Password must contain at least 6 characters.", "error");
        return;
    }
    if (password !== confirmPassword) {
        setAuthMessage(message, "Passwords do not match.", "error");
        return;
    }
    if (!isSupabaseReady(message)) return;
 
    button.disabled = true;
    const originalButtonText = button.textContent;
    button.textContent = "Creating account...";
 
    try {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: CHESS_SITE_BASE + "confirm-email.html"
            }
        });
        if (error) throw error;
        if (!data || !data.user) throw new Error("Supabase did not return a user after registration.");
 
        if (data.session) {
            [localStorage, sessionStorage].forEach(storage => {
                storage.removeItem(GUEST_MODE_KEY);
                storage.setItem("userEmail", data.user.email || email);
            });
            setAuthMessage(message, "Account created successfully. Redirecting...", "success");
            window.location.href = "./dashboard.html";
            return;
        }
 
        setAuthMessage(message,
            "Account created! Check your inbox and click the confirmation link before logging in.",
            "success");
        button.disabled = false;
        button.textContent = originalButtonText || "Create Account";
    } catch (error) {
        console.error("REGISTER ERROR:", error);
        setAuthMessage(message, getAuthErrorMessage(error), "error");
        button.disabled = false;
        button.textContent = originalButtonText || "Create Account";
    }
}
 
/* =====================================================
   EMAIL CONFIRMATION PAGE
===================================================== */
 
function initializeEmailConfirmation() {
    const message = document.getElementById("confirmEmailMessage") ||
        document.getElementById("confirmMessage");
    const confirmationStatus = document.getElementById("confirmationStatus");
    if (!message && !confirmationStatus) return;
 
    const statusElement = message || confirmationStatus;
    if (!isSupabaseReady(statusElement)) return;
 
    const params = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const errorCode = params.get("error_code") || queryParams.get("error_code");
    const errorDescription = params.get("error_description") || queryParams.get("error_description");
 
    if (errorCode || errorDescription) {
        setAuthMessage(statusElement,
            "Email confirmation failed or the link has expired. Please request a new confirmation email.",
            "error");
        return;
    }
 
    const code = queryParams.get("code");
    if (code) {
        window.supabaseClient.auth.exchangeCodeForSession(code)
            .then(({ data, error }) => {
                if (error) throw error;
                if (!data || !data.user) throw new Error("Confirmation did not return a user.");
                [localStorage, sessionStorage].forEach(storage => {
                    storage.removeItem(GUEST_MODE_KEY);
                    storage.setItem("userEmail", data.user.email || "");
                });
                setAuthMessage(statusElement, "Email confirmed successfully! You can now log in.", "success");
            })
            .catch(error => {
                console.error("EMAIL CONFIRMATION ERROR:", error);
                setAuthMessage(statusElement,
                    "We could not confirm this email link. It may have expired or already been used. Please request a new confirmation email.",
                    "error");
            });
        return;
    }
 
    const tokenHash = queryParams.get("token_hash");
    const type = queryParams.get("type");
    if (tokenHash && type === "email") {
        window.supabaseClient.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
            .then(({ data, error }) => {
                if (error) throw error;
                if (!data || !data.user) throw new Error("Email verification did not return a user.");
                [localStorage, sessionStorage].forEach(storage => {
                    storage.removeItem(GUEST_MODE_KEY);
                    storage.setItem("userEmail", data.user.email || "");
                });
                setAuthMessage(statusElement, "Email confirmed successfully! You can now log in.", "success");
            })
            .catch(error => {
                console.error("EMAIL VERIFICATION ERROR:", error);
                setAuthMessage(statusElement,
                    "We could not verify this email link. It may have expired or already been used. Please request a new confirmation email.",
                    "error");
            });
        return;
    }
 
    let resolved = false;
    const { data: listener } = window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (resolved) return;
        if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
            resolved = true;
            setAuthMessage(statusElement,
                "Email confirmation processed successfully. You can now log in.", "success");
        }
    });
 
    window.supabaseClient.auth.getSession()
        .then(({ data, error }) => {
            if (error) throw error;
            if (data && data.session && !resolved) {
                resolved = true;
                setAuthMessage(statusElement,
                    "Your email confirmation was processed. You can now log in.", "success");
            } else if (!resolved) {
                setAuthMessage(statusElement,
                    "Open the confirmation link from your email. If it has expired, request a new confirmation email.",
                    "error");
            }
        })
        .catch(error => {
            console.error("CONFIRMATION SESSION CHECK ERROR:", error);
            if (!resolved) setAuthMessage(statusElement,
                "We could not verify the confirmation session. Please open the latest confirmation email.", "error");
        });
}
 
/* =====================================================
   FORGOT PASSWORD + 30-SECOND CLIENT-SIDE COOLDOWN
===================================================== */
 
function getResetCooldownKey(email) {
    return RESET_COOLDOWN_PREFIX + String(email || "").trim().toLowerCase();
}
 
function getResetCooldownRemaining(email) {
    const until = Number(localStorage.getItem(getResetCooldownKey(email)) || 0);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}
 
function startResetCooldown(button, email) {
    if (resetCooldownInterval) window.clearInterval(resetCooldownInterval);
    const key = getResetCooldownKey(email);
    localStorage.setItem(key, String(Date.now() + 30000));
 
    const originalText = "Send Reset Link";
    const update = () => {
        const remaining = getResetCooldownRemaining(email);
        if (remaining <= 0) {
            if (resetCooldownInterval) window.clearInterval(resetCooldownInterval);
            resetCooldownInterval = null;
            button.disabled = false;
            button.textContent = originalText;
            return;
        }
        button.disabled = true;
        button.textContent = `Try again in ${remaining}s`;
    };
    update();
    resetCooldownInterval = window.setInterval(update, 1000);
}
 
async function handleForgotPassword(event) {
    event.preventDefault();
 
    const emailInput = document.getElementById("forgotEmail");
    const message = document.getElementById("forgotPasswordMessage");
    const button = document.getElementById("forgotPasswordButton") ||
        document.querySelector("#forgotPasswordForm button[type='submit']");
 
    if (!emailInput || !message || !button) {
        console.error("Forgot password form elements are missing.");
        return;
    }
 
    const email = emailInput.value.trim();
    setAuthMessage(message, "", "");
    if (!email) {
        setAuthMessage(message, "Please enter your email address.", "error");
        return;
    }
 
    const remaining = getResetCooldownRemaining(email);
    if (remaining > 0) {
        setAuthMessage(message, `Please wait ${remaining} seconds before requesting another reset link.`, "error");
        startResetCooldown(button, email);
        return;
    }
    if (!isSupabaseReady(message)) return;
 
    button.disabled = true;
    const originalButtonText = button.textContent;
    button.textContent = "Sending...";
 
    try {
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: CHESS_SITE_BASE + "reset-password.html"
        });
        if (error) throw error;
 
        setAuthMessage(message,
            "If an account exists for this email, a password reset link has been sent. Please check your inbox.",
            "success");
        startResetCooldown(button, email);
    } catch (error) {
        console.error("PASSWORD RESET ERROR:", error);
        setAuthMessage(message, getAuthErrorMessage(error), "error");
        button.disabled = false;
        button.textContent = originalButtonText || "Send Reset Link";
    }
}
 
/* =====================================================
   PASSWORD RESET INITIALIZATION
===================================================== */
 
function initializePasswordReset(form) {
    const message = document.getElementById("resetPasswordMessage");
    const button = document.getElementById("resetPasswordButton") ||
        form.querySelector("button[type='submit']");
    if (!isSupabaseReady(message)) return;
 
    if (button) button.disabled = true;
    setAuthMessage(message, "Checking your password reset link...", "");
 
    // Capture URL markers before Supabase processes/cleans the callback URL.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const hasRecoveryMarker = hashParams.get("type") === "recovery" ||
        queryParams.get("type") === "recovery" ||
        queryParams.has("code");
    const callbackError = hashParams.get("error_description") ||
        queryParams.get("error_description") || hashParams.get("error_code") ||
        queryParams.get("error_code");
 
    if (callbackError) {
        setAuthMessage(message,
            "This password reset link has expired or is invalid. Return to Forgot Password and request a new link.",
            "error");
        return;
    }
 
    const enableReset = () => {
        passwordRecoveryReady = true;
        if (button) button.disabled = false;
        setAuthMessage(message, "Reset link verified. Enter and confirm your new password below.", "success");
    };
 
    const { data: authListener } = window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
            enableReset();
        }
    });
 
    window.supabaseClient.auth.getSession()
        .then(({ data, error }) => {
            if (error) throw error;
            if (data && data.session && hasRecoveryMarker) {
                enableReset();
            } else if (!passwordRecoveryReady) {
                setAuthMessage(message,
                    "No valid password reset session was found. Please open the newest reset link from your email, or request another one.",
                    "error");
                if (button) button.disabled = true;
            }
        })
        .catch(error => {
            console.error("PASSWORD RECOVERY SESSION ERROR:", error);
            if (!passwordRecoveryReady) {
                setAuthMessage(message,
                    "We could not verify this reset link. It may have expired. Please request a new password reset link.",
                    "error");
                if (button) button.disabled = true;
            }
        });
 
    form.addEventListener("submit", handlePasswordUpdate);
}
 
/* =====================================================
   UPDATE PASSWORD
===================================================== */
 
async function handlePasswordUpdate(event) {
    event.preventDefault();
 
    const passwordInput = document.getElementById("newPassword");
    const confirmInput = document.getElementById("confirmNewPassword");
    const message = document.getElementById("resetPasswordMessage");
    const button = document.getElementById("resetPasswordButton") ||
        document.querySelector("#resetPasswordForm button[type='submit']");
 
    if (!passwordInput || !confirmInput || !message || !button) {
        console.error("Password reset form elements are missing.");
        return;
    }
    if (!passwordRecoveryReady) {
        setAuthMessage(message,
            "The reset link has not been verified. Please open the newest link from your email.", "error");
        return;
    }
 
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;
    setAuthMessage(message, "", "");
 
    if (password.length < 6) {
        setAuthMessage(message, "Password must contain at least 6 characters.", "error");
        return;
    }
    if (password !== confirmPassword) {
        setAuthMessage(message, "Passwords do not match.", "error");
        return;
    }
    if (!isSupabaseReady(message)) return;
 
    button.disabled = true;
    const originalButtonText = button.textContent;
    button.textContent = "Updating password...";
 
    try {
        const { error } = await window.supabaseClient.auth.updateUser({ password });
        if (error) throw error;
 
        passwordInput.value = "";
        confirmInput.value = "";
        passwordRecoveryReady = false;
        setAuthMessage(message,
            "Password updated successfully. You can now log in with your new password. Redirecting...",
            "success");
 
        // Password has already been updated; sign-out failure must not show a false update error.
        try {
            await window.supabaseClient.auth.signOut();
        } catch (signOutError) {
            console.warn("Password was updated, but signing out failed:", signOutError);
        }
 
        clearAccountMarkers();
        window.setTimeout(() => {
            window.location.href = "./login.html";
        }, 1600);
    } catch (error) {
        console.error("UPDATE PASSWORD ERROR:", error);
        setAuthMessage(message, getAuthErrorMessage(error), "error");
        button.disabled = false;
        button.textContent = originalButtonText || "Set New Password";
    }
}
 
/* =====================================================
   ERROR MESSAGES
===================================================== */
 
function getAuthErrorMessage(error) {
    if (!error) return "Authentication failed. Please try again.";
    const message = String(error.message || "").toLowerCase();
 
    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
        return "Incorrect email or password.";
    }
    if (message.includes("email not confirmed")) {
        return "Your email has not been confirmed. Please check your inbox.";
    }
    if (message.includes("user already registered") || message.includes("already registered")) {
        return "An account with this email already exists.";
    }
    if (message.includes("password should be at least") || message.includes("password must be at least")) {
        return "Your password does not meet the minimum length requirement.";
    }
    if (message.includes("unable to validate email") ||
        (message.includes("email address") && message.includes("invalid"))) {
        return "Please enter a valid email address.";
    }
    if (message.includes("expired") || message.includes("invalid token") ||
        message.includes("otp_expired") || message.includes("invalid recovery token")) {
        return "This link has expired or is invalid. Please request a new email.";
    }
    if (message.includes("failed to fetch") || message.includes("network") || message.includes("fetch")) {
        return "Connection error. Please check your internet connection and try again.";
    }
    return error.message || "Authentication failed. Please try again.";
}