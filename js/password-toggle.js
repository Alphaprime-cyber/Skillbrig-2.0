document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('input[type="password"]').forEach((input, index) => {
        if (input.dataset.visibilityToggleReady === "true") return;
        input.dataset.visibilityToggleReady = "true";

        const wrapper = document.createElement("span");
        wrapper.className = "password-input-wrap";
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        if (!input.id) input.id = `password-field-${index + 1}`;

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "password-toggle";
        toggle.setAttribute("aria-label", "Show password");
        toggle.setAttribute("aria-controls", input.id);
        toggle.setAttribute("aria-pressed", "false");
        toggle.title = "Show password";
        toggle.innerHTML = '<i class="fas fa-eye" aria-hidden="true"></i>';

        toggle.addEventListener("click", () => {
            const reveal = input.type === "password";
            input.type = reveal ? "text" : "password";
            toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
            toggle.setAttribute("aria-pressed", String(reveal));
            toggle.title = reveal ? "Hide password" : "Show password";
            toggle.innerHTML = `<i class="fas ${reveal ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i>`;
        });

        wrapper.appendChild(toggle);
    });
});
