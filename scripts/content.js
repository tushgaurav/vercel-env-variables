async function fetchEnv(authorizationCookie, projectName) {
  const apiUrl = `https://vercel.com/api/v9/projects/${projectName}`;
  const cookieHeader = `${"authorization"}=${authorizationCookie};`;

  try {
    const fetchOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    };
    const response = await fetch(apiUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const projectData = await response.json();

    const encryptedEnvVars =
      projectData.env?.map((env) => ({
        id: env.id,
        key: env.key,
        encryptedValue: env.value,
      })) || [];

    const envVars = [];
    for (encryptedEnv of encryptedEnvVars) {
      const envResponse = await fetch(
        `https://vercel.com/api/v1/projects/${projectName}/env/${encryptedEnv.id}`,
        fetchOptions
      );

      if (!envResponse.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      const envData = await envResponse.json();

      envVars.push({
        key: envData.key,
        value: envData.value,
      });
    }

    return { env: envVars };
  } catch (error) {
    console.error("Failed to fetch project data:", error);
    return { error: error.message };
  }
}

function copyAllEnv(envArray) {
  const envContent = envArray
    .map((env) => `${env.key}=${env.value}`)
    .join("\n");
  navigator.clipboard
    .writeText(envContent)
    .then(() => {
      alert("All ENV variables copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy ENV variables:", err);
    });
}

function downloadEnvFile(filename, envArray) {
  const envContent = envArray
    .map((env) => `${env.key}=${env.value}`)
    .join("\n");

  const blob = new Blob([envContent], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

const projectName = document.querySelector(
  "body > div.bg-background-200.min-h-vh.relative > header > nav > ul > li:nth-child(2) > div > a > p"
)?.textContent;

function initializeUI() {
  const targetElement = document.querySelector(
    "#environment-variables-fieldset > span:nth-child(5)"
  );

  if (!targetElement) {
    console.error("Target element not found!");
    return;
  }

  if (!projectName) {
    console.error("Project name not found!");
    const errorUI = createUI(false, { error: "Project name not found. Please refresh the page." });
    targetElement.parentNode.insertBefore(errorUI, targetElement.nextSibling);
    return;
  }

  const loadingUI = createUI(true);
  targetElement.parentNode.insertBefore(loadingUI, targetElement.nextSibling);

  chrome.runtime.sendMessage({ text: "getAuthorization" }, function (response) {
    console.log("Response: ", response);

    fetchEnv(response, projectName).then((result) => {
      loadingUI.remove();

      const resultUI = createUI(false, result);
      targetElement.parentNode.insertBefore(resultUI, targetElement.nextSibling);
    });
  });
}

initializeUI();

let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    setTimeout(initializeUI, 1000);
  }
}).observe(document, { subtree: true, childList: true });

function createUI(isLoading = true, result = null) {
  const headingContainer = document.createElement("div");
  headingContainer.className = "stack_stack__iZkUS stack";
  headingContainer.setAttribute("data-version", "v1");
  headingContainer.style.cssText = "--stack-flex: initial; --stack-direction: row; --stack-align: center; --stack-justify: flex-start; --stack-padding: 0px; --stack-gap: 8px;";

  const heading = document.createElement("h3");
  heading.className = "text_wrapper__i87JK";
  heading.setAttribute("data-version", "v1");
  heading.style.cssText = "--text-color: var(--ds-gray-1000); --text-size: 1rem; --text-line-height: 1.5rem;  --text-letter-spacing: -0.020625rem; --text-weight: 600; padding-bottom: 8px;";
  heading.textContent = "Export Environment Variables";

  headingContainer.appendChild(heading);

  const cardContainer = document.createElement("div");
  cardContainer.className = "geist-themed geist-default entity_form__ly2Cv geist-text p";
  cardContainer.setAttribute("type", "default");
  
  const stackDiv = document.createElement("div");
  stackDiv.className = "stack_stack__iZkUS stack";
  stackDiv.setAttribute("data-version", "v1");
  stackDiv.style.cssText = "--stack-flex: initial; --stack-direction: column; --stack-align: start; --stack-justify: flex-start; --stack-padding: 0px; --stack-gap: 12px;";

  if (isLoading) {
    const loadingDiv = document.createElement("div");
    loadingDiv.style.cssText = "display: flex; align-items: center; gap: 8px; color: var(--ds-gray-700);";
    loadingDiv.innerHTML = `
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1s linear infinite;
          transform-origin: center;
        }
      </style>
      <svg class="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" stroke-dasharray="44" stroke-dashoffset="22" stroke-linecap="round"/>
      </svg>
      <span>Loading environment variables...</span>
    `;
    stackDiv.appendChild(loadingDiv);
  } else if (result?.error) {
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = "color: var(--ds-red-600); padding: 8px;";
    errorDiv.textContent = `Error: ${result.error}`;
    stackDiv.appendChild(errorDiv);
  } else if (result?.env) {
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = "display: flex; gap: 8px; justify-content: space-between;";

    // Copy all button
    const copyButton = document.createElement("button");
    copyButton.className = "button_base__BjwbK reset_reset__KRyvc button_button__81573 reset_reset__KRyvc button_secondary__kMMNc button_small__iQMBm button_invert__YNhnn";
    copyButton.setAttribute("data-geist-button", "");
    copyButton.setAttribute("data-prefix", "true");
    copyButton.setAttribute("data-suffix", "false");
    copyButton.setAttribute("data-version", "v1");
    copyButton.style.setProperty("--geist-icon-size", "16px");
    copyButton.innerHTML = `<span class="button_prefix__2XlwH">
                      <svg data-testid="geist-icon" height="16" stroke-linejoin="round" viewBox="0 0 16 16" width="16" style="color: currentcolor;">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M14.5 13.5V6.5V5.41421C14.5 5.149 14.3946 4.89464 14.2071 4.70711L9.79289 0.292893C9.60536 0.105357 9.351 0 9.08579 0H8H3H1.5V1.5V13.5C1.5 14.8807 2.61929 16 4 16H12C13.3807 16 14.5 14.8807 14.5 13.5ZM13 13.5V6.5H9.5H8V5V1.5H3V13.5C3 14.0523 3.44772 14.5 4 14.5H12C12.5523 14.5 13 14.0523 13 13.5ZM9.5 5V2.12132L12.3787 5H9.5ZM5.13 5.00062H4.505V6.25062H5.13H6H6.625V5.00062H6H5.13ZM4.505 8H5.13H11H11.625V9.25H11H5.13H4.505V8ZM5.13 11H4.505V12.25H5.13H11H11.625V11H11H5.13Z" fill="currentColor"></path>
                      </svg>
                    </span>
                    <span class="button_content__1aE1_">Copy</span>`;
    copyButton.addEventListener("click", () => copyAllEnv(result.env));

    // Download .env button
    const downloadEnvButton = document.createElement("button");
    downloadEnvButton.className = copyButton.className;
    downloadEnvButton.setAttribute("data-geist-button", "");
    downloadEnvButton.setAttribute("data-prefix", "true");
    downloadEnvButton.setAttribute("data-suffix", "false");
    downloadEnvButton.setAttribute("data-version", "v1");
    downloadEnvButton.style.setProperty("--geist-icon-size", "16px");
    downloadEnvButton.innerHTML = `<span class="button_prefix__2XlwH">
                      <svg data-testid="geist-icon" height="16" stroke-linejoin="round" viewBox="0 0 16 16" width="16" style="color: currentcolor;">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M8 12L3 7l1.4-1.4L7 8.2V1h2v7.2l2.6-2.6L13 7l-5 5zm-6 2h12v-2H2v2z" fill="currentColor"></path>
                      </svg>
                    </span>
                    <span class="button_content__1aE1_">.env</span>`;
    downloadEnvButton.addEventListener("click", () => downloadEnvFile(".env", result.env));

    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(downloadEnvButton);
    stackDiv.appendChild(buttonContainer);
  }

  cardContainer.appendChild(headingContainer);
  cardContainer.appendChild(stackDiv);

  return cardContainer;
}
