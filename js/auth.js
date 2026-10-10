/* =====================================================
   CHESS TOURNAMENT MANAGER
   AUTHENTICATION
   LOGIN + REGISTER + GUEST MODE + PASSWORD RESET
   EMAIL CONFIRMATION REDIRECT
===================================================== */

"use strict";

const CHESS_SITE_BASE =
    "https://ammourrabie9-boop.github.io/chess-tournament-manager-/pages/";


/* =====================================================
   INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    const registerForm =
        document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }

    const guestButton =
        document.getElementById("guestButton");

    if (guestButton) {
        guestButton.addEventListener("click", handleGuestLogin);
    }

    const forgotPasswordForm =
        document.getElementById("forgotPasswordForm");

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener(
            "submit",
            handleForgotPassword
        );
    }

    const resetPasswordForm =
        document.getElementById("resetPasswordForm");

    if (resetPasswordForm) {
        initializePasswordReset(resetPasswordForm);
    }

    initializeEmailConfirmation();
});


/* =====================================================
   SUPABASE CHECK
===================================================== */

function isSupabaseReady(message) {

    if (
        !window.supabaseClient ||
        !window.supabaseClient.auth
    ) {
        if (message) {
            message.textContent =
                "Supabase connection is not available. Please try again later.";

            message.className = "auth-message error";
        }

        console.error("Supabase client is not available.");

        return false;
    }

    return true;
}


/* =====================================================
   AUTH MESSAGE HELPER
===================================================== */

function setAuthMessage(element, text, type) {

    if (!element) {
        return;
    }

    element.textContent = text;
    element.className = "auth-message " + (type || "");
}


/* =====================================================
   GUEST MODE
===================================================== */

function handleGuestLogin() {

    localStorage.removeItem("userEmail");
    sessionStorage.removeItem("userEmail");

    localStorage.setItem(
        "chessTournamentManager_guestMode",
        "true"
    );

    sessionStorage.setItem(
        "chessTournamentManager_guestMode",
        "true"
    );

    window.location.href = "./dashboard.html";
}


/* =====================================================
   LOGIN
===================================================== */

async function handleLogin(event) {

    event.preventDefault();

    const emailInput =
        document.getElementById("loginEmail");

    const passwordInput =
        document.getElementById("loginPassword");

    const message =
        document.getElementById("loginMessage");

    const button =
        document.getElementById("loginButton") ||
        document.querySelector(
            "#loginForm button[type='submit']"
        );

    if (!emailInput || !passwordInput || !message || !button) {
        console.error("Login form elements are missing.");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    setAuthMessage(message, "", "");

    if (!email || !password) {
        setAuthMessage(
            message,
            "Please enter your email and password.",
            "error"
        );
        return;
    }

    if (!isSupabaseReady(message)) {
        return;
    }

    button.disabled = true;
    const originalButtonText = button.textContent;
    button.textContent = "Logging in...";

    try {

        const { data, error } =
            await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            throw error;
        }

        if (!data || !data.user || !data.session) {
            throw new Error(
                "Login completed without an active session."
            );
        }

        localStorage.removeItem(
            "chessTournamentManager_guestMode"
        );

        sessionStorage.removeItem(
            "chessTournamentManager_guestMode"
        );

        localStorage.setItem(
            "userEmail",
            data.user.email || email
        );

        sessionStorage.setItem(
            "userEmail",
            data.user.email || email
        );

        setAuthMessage(
            message,
            "Login successful. Redirecting...",
            "success"
        );

        window.location.href = "./dashboard.html";

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        setAuthMessage(
            message,
            getAuthErrorMessage(error),
            "error"
        );

        button.disabled = false;
        button.textContent = originalButtonText || "Login";
    }
}


/* =====================================================
   REGISTER
===================================================== */

async function handleRegister(event) {

    event.preventDefault();

    const emailInput =
        document.getElementById("registerEmail");

    const passwordInput =
        document.getElementById("registerPassword");

    const confirmInput =
        document.getElementById("confirmPassword");

    const message =
        document.getElementById("registerMessage");

    const button =
        document.querySelector(
            "#registerForm button[type='submit']"
        );

    if (
        !emailInput ||
        !passwordInput ||
        !confirmInput ||
        !message ||
        !button
    ) {
        console.error(
            "Registration form elements are missing."
        );
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    setAuthMessage(message, "", "");

    if (!email) {
        setAuthMessage(
            message,
            "Please enter your email.",
            "error"
        );
        return;
    }

    if (password.length < 6) {
        setAuthMessage(
            message,
            "Password must contain at least 6 characters.",
            "error"
        );
        return;
    }

    if (password !== confirmPassword) {
        setAuthMessage(
            message,
            "Passwords do not match.",
            "error"
        );
        return;
    }

    if (!isSupabaseReady(message)) {
        return;
    }

    button.disabled = true;
    const originalButtonText = button.textContent;
    button.textContent = "Creating account...";

    try {

        const emailRedirectTo =
            CHESS_SITE_BASE + "confirm-email.html";

        const { data, error } =
            await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: emailRedirectTo
                }
            });

        if (error) {
            throw error;
        }

        if (!data || !data.user) {
            throw new Error(
                "Supabase did not return a user after registration."
            );
        }

        if (data.session) {

            localStorage.removeItem(
                "chessTournamentManager_guestMode"
            );

            sessionStorage.removeItem(
                "chessTournamentManager_guestMode"
            );

            localStorage.setItem(
                "userEmail",
                data.user.email || email
            );

            sessionStorage.setItem(
                "userEmail",
                data.user.email || email
            );

            setAuthMessage(
                message,
                "Account created successfully. Redirecting...",
                "success"
            );

            window.location.href = "./dashboard.html";
            return;
        }

        setAuthMessage(
            message,
            "Account created! Check your inbox and click the confirmation link before logging in.",
            "success"
        );

        button.disabled = false;
        button.textContent = originalButtonText || "Create Account";

    } catch (error) {

        console.error("REGISTER ERROR:", error);

        setAuthMessage(
            message,
            getAuthErrorMessage(error),
            "error"
        );

        button.disabled = false;
        button.textContent = originalButtonText || "Create Account";
    }
}


/* =====================================================
   EMAIL CONFIRMATION PAGE
===================================================== */

function initializeEmailConfirmation() {

    const message =
        document.getElementById("confirmEmailMessage") ||
        document.getElementById("confirmMessage");

    const confirmationStatus =
        document.getElementById("confirmationStatus");

    if (!message && !confirmationStatus) {
        return;
    }

    const statusElement = message || confirmationStatus;

    if (!isSupabaseReady(statusElement)) {
        return;
    }

    const params = new URLSearchParams(
        window.location.hash.substring(1)
    );

    const queryParams = new URLSearchParams(
        window.location.search
    );

    const errorCode =
        params.get("error_code") ||
        queryParams.get("error_code");

    const errorDescription =
        params.get("error_description") ||
        queryParams.get("error_description");

    if (errorCode || errorDescription) {
        setAuthMessage(
            statusElement,
            "Email confirmation failed or the link has expired. Please request a new confirmation email.",
            "error"
        );
        return;
    }

    const code = queryParams.get("code");

    if (code) {

        window.supabaseClient.auth
            .exchangeCodeForSession(code)
            .then(({ data, error }) => {

                if (error) {
                    throw error;
                }

                if (!data || !data.user) {
                    throw new Error(
                        "Confirmation did not return a user."
                    );
                }

                localStorage.removeItem(
                    "chessTournamentManager_guestMode"
                );

                sessionStorage.removeItem(
                    "chessTournamentManager_guestMode"
                );

                localStorage.setItem(
                    "userEmail",
                    data.user.email || ""
                );

                sessionStorage.setItem(
                    "userEmail",
                    data.user.email || ""
                );

                setAuthMessage(
                    statusElement,
                    "Email confirmed successfully! You can now log in.",
                    "success"
                );

            })
            .catch((error) => {

                console.error(
                    "EMAIL CONFIRMATION ERROR:",
                    error
                );

                setAuthMessage(
                    statusElement,
                    "We could not confirm this email link. It may have expired or already been used. Please request a new confirmation email.",
                    "error"
                );
            });

        return;
    }

    const tokenHash = queryParams.get("token_hash");
    const type = queryParams.get("type");

    if (tokenHash && type === "email") {

        window.supabaseClient.auth
            .verifyOtp({
                token_hash: tokenHash,
                type: "email"
            })
            .then(({ data, error }) => {

                if (error) {
                    throw error;
                }

                if (!data || !data.user) {
                    throw new Error(
                        "Email verification did not return a user."
                    );
                }

                localStorage.removeItem(
                    "chessTournamentManager_guestMode"
                );

                sessionStorage.removeItem(
                    "chessTournamentManager_guestMode"
                );

                localStorage.setItem(
                    "userEmail",
                    data.user.email || ""
                );

                sessionStorage.setItem(
                    "userEmail",
                    data.user.email || ""
                );

                setAuthMessage(
                    statusElement,
                    "Email confirmed successfully! You can now log in.",
                    "success"
                );

            })
            .catch((error) => {

                console.error(
                    "EMAIL VERIFICATION ERROR:",
                    error
                );

                setAuthMessage(
                    statusElement,
                    "We could not verify this email link. It may have expired or already been used. Please request a new confirmation email.",
                    "error"
                );
            });

        return;
    }

    let resolved = false;

    const { data: listener } =
        window.supabaseClient.auth.onAuthStateChange(
            (event, session) => {

                if (resolved) {
                    return;
                }

                if (
                    session &&
                    (
                        event === "SIGNED_IN" ||
                        event === "INITIAL_SESSION"
                    )
                ) {
                    resolved = true;

                    setAuthMessage(
                        statusElement,
                        "Email confirmation processed successfully. You can now log in.",
                        "success"
                    );
                }
            }
        );

    window.supabaseClient.auth.getSession()
        .then(({ data, error }) => {

            if (error) {
                throw error;
            }

            if (data && data.session && !resolved) {
                resolved = true;

                setAuthMessage(
                    statusElement,
                    "Your email confirmation was processed. You can now log in.",
                    "success"
                );

                return;
            }

            if (!resolved) {
                setAuthMessage(
                    statusElement,
                    "Open the confirmation link from your email. If it has expired, request a new confirmation email.",
                    "error"
                );
            }

        })
        .catch((error) => {

            console.error(
                "CONFIRMATION SESSION CHECK ERROR:",
                error
            );

            if (!resolved) {
                setAuthMessage(
                    statusElement,
                    "We could not verify the confirmation session. Please open the latest confirmation email.",
                    "error"
                );
            }
        });
}


/* =====================================================
   FORGOT PASSWORD
===================================================== */

async function handleForgotPassword(event) {

    event.preventDefault();

    const emailInput =
        document.getElementById("forgotEmail");

    const message =
        document.getElementById("forgotPasswordMessage");

    const button =
        document.getElementById("forgotPasswordButton");

    if (!emailInput || !message || !button) {
        console.error(
            "Forgot password form elements are missing."
        );
        return;
    }

    const email = emailInput.value.trim();

    setAuthMessage(message, "", "");

    if (!email) {
        setAuthMessage(
            message,
            "Please enter your email address.",
            "error"
        );
        return;
    }

    if (!isSupabaseReady(message)) {
        return;
    }

    button.disabled = true;
    const originalButtonText = button.textContent;
    button.textContent = "Sending...";

    try {

        const redirectTo =
            CHESS_SITE_BASE + "reset-password.html";

        const { error } =
            await window.supabaseClient.auth
                .resetPasswordForEmail(email, {
                    redirectTo: redirectTo
                });

        if (error) {
            throw error;
        }

        setAuthMessage(
            message,
            "If an account exists for this email, a password reset link has been sent. Please check your inbox.",
            "success"
        );

        button.disabled = false;
        button.textContent = originalButtonText || "Send Reset Link";

    } catch (error) {

        console.error("PASSWORD RESET ERROR:", error);

        setAuthMessage(
            message,
            getAuthErrorMessage(error),
            "error"
        );

        button.disabled = false;
        button.textContent = originalButtonText || "Send Reset Link";
    }
}


/* =====================================================
   PASSWORD RESET INITIALIZATION
===================================================== */

function initializePasswordReset(form) {

    const message =
        document.getElementById("resetPasswordMessage");

    if (!isSupabaseReady(message)) {
        return;
    }

    window.supabaseClient.auth.onAuthStateChange(
        (event) => {

            if (event === "PASSWORD_RECOVERY") {
                console.log(
                    "Password recovery session detected."
                );
            }
        }
    );

    form.addEventListener(
        "submit",
        handlePasswordUpdate
    );
}


/* =====================================================
   UPDATE PASSWORD
===================================================== */

async function handlePasswordUpdate(event) {

    event.preventDefault();

    const passwordInput =
        document.getElementById("newPassword");

    const confirmInput =
        document.getElementById("confirmNewPassword");

    const message =
        document.getElementById("resetPasswordMessage");

    const button =
        document.getElementById("resetPasswordButton");

    if (!passwordInput || !confirmInput || !message || !button) {
        console.error(
            "Password reset form elements are missing."
        );
        return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    setAuthMessage(message, "", "");

    if (password.length < 6) {
        setAuthMessage(
            message,
            "Password must contain at least 6 characters.",
            "error"
        );
        return;
    }

    if (password !== confirmPassword) {
        setAuthMessage(
            message,
            "Passwords do not match.",
            "error"
        );
        return;
    }

    if (!isSupabaseReady(message)) {
        return;
    }

    button.disabled = true;
    const originalButtonText = button.textContent;
    button.textContent = "Updating password...";

    try {

        const { error } =
            await window.supabaseClient.auth.updateUser({
                password: password
            });

        if (error) {
            throw error;
        }

        passwordInput.value = "";
        confirmInput.value = "";

        setAuthMessage(
            message,
            "Password updated successfully. You can now log in with your new password.",
            "success"
        );

        await window.supabaseClient.auth.signOut();

        localStorage.removeItem("userEmail");
        sessionStorage.removeItem("userEmail");

        localStorage.removeItem(
            "chessTournamentManager_guestMode"
        );

        sessionStorage.removeItem(
            "chessTournamentManager_guestMode"
        );

        window.setTimeout(() => {
            window.location.href = "./login.html";
        }, 1800);

    } catch (error) {

        console.error("UPDATE PASSWORD ERROR:", error);

        setAuthMessage(
            message,
            getAuthErrorMessage(error),
            "error"
        );

        button.disabled = false;
        button.textContent = originalButtonText || "Set New Password";
    }
}


/* =====================================================
   ERROR MESSAGES
===================================================== */

function getAuthErrorMessage(error) {

    if (!error) {
        return "Authentication failed. Please try again.";
    }

    const message =
        String(error.message || "").toLowerCase();

    if (
        message.includes("invalid login credentials") ||
        message.includes("invalid credentials")
    ) {
        return "Incorrect email or password.";
    }

    if (message.includes("email not confirmed")) {
        return "Your email has not been confirmed. Please check your inbox.";
    }

    if (
        message.includes("user already registered") ||
        message.includes("already registered")
    ) {
        return "An account with this email already exists.";
    }

    if (
        message.includes("password should be at least") ||
        message.includes("password must be at least")
    ) {
        return "Your password does not meet the minimum length requirement.";
    }

    if (
        message.includes("unable to validate email") ||
        (
            message.includes("email address") &&
            message.includes("invalid")
        )
    ) {
        return "Please enter a valid email address.";
    }

    if (
        message.includes("expired") ||
        message.includes("invalid token") ||
        message.includes("otp_expired")
    ) {
        return "This link has expired or is invalid. Please request a new email.";
    }

    if (
        message.includes("failed to fetch") ||
        message.includes("network") ||
        message.includes("fetch")
    ) {
        return "Connection error. Please check your internet connection and try again.";
    }

    return error.message ||
        "Authentication failed. Please try again.";
}
