// =====================================================
// CHESS TOURNAMENT MANAGER
// SUPABASE CONFIGURATION
// =====================================================

(function () {

    const SUPABASE_URL =
        "https://vtkhezcjnjyhwqyawawv.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_4qodOAWloELBwk1CK7MzlQ_tpv4zfCo";

    // Check Supabase library
    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {
        console.error(
            "ERROR: Supabase library was not loaded."
        );

        window.supabaseClient = null;

        return;
    }

    try {

        window.supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY
            );

        console.log(
            "SUCCESS: Supabase client created successfully."
        );

    } catch (error) {

        console.error(
            "ERROR: Supabase client creation failed:",
            error
        );

        window.supabaseClient = null;
    }

})();