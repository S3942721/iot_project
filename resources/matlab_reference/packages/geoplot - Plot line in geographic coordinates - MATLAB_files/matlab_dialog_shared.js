/**
 * Constants and templates related to copying code blocks and commands
 * CA_GET_DROP_DOWN_TEXT: Text for dropdown button to get code 
 * CA_COPY_CODE_BLOCK_BUTTON_TEXT: Text for button to copy code block
 * CA_COPY_OPEN_EXAMPLE_COMMAND_TEXT: Text for button to copy open example command
 * CA_OPEN_EXAMPLE_COMMAND_INSTRUCTION: Instruction for user to paste open example command
 * CA_COPY_CODE_BLOCK_CONFIRMATION_TOOLTIP: Confirmation tooltip when code block copied
 * CA_COPY_OPEN_EXAMPLE_COMMAND_CONFIRMATION_TOOLTIP: Confirmation tooltip when command copied
 * CA_TEMPLATE: Template for copy buttons and tooltips 
 * CA_COPY_CODE_BLOCK_TEMPLATE: Template to copy code blocks
 * CA_COPY_OPEN_EXAMPLE_COMMAND_TEMPLATE: Template to copy open example commands
 * copyButtonTemplate: Base template for copy command buttons
 * owReadyFired: Tracks the state of the OpenWith API dispatched ready event
*/
let COPY_COMMAND_BUTTON;

let CA_GET_DROP_DOWN_TEXT;

let CA_COPY_CODE_BLOCK_BUTTON_TEXT;

let CA_COPY_OPEN_EXAMPLE_COMMAND_TEXT;

let CA_OPEN_EXAMPLE_COMMAND_INSTRUCTION;

let CA_COPY_CODE_BLOCK_CONFIRMATION_TOOLTIP;

let CA_COPY_OPEN_EXAMPLE_COMMAND_CONFIRMATION_TOOLTIP;

let CA_TEMPLATE;

let CA_COPY_CODE_BLOCK_TEMPLATE;

let CA_COPY_OPEN_EXAMPLE_COMMAND_TEMPLATE;

let copyButtonTemplate;

let owReadyFired = false;

const installedMATLABTargetPlatform = "desktop";

const webMATLABTargetPlatform = "web";

const openExampleAction = "openexample";

const owTargetApplication = "matlab";

const docSessionStorage = "mw_doc_action";

/**
 * InstallInfo Helper - Provides access to user's installed product information
 */
const InstallInfoHelper = {
    // Cache configuration
    CACHE_TIME_TO_LIVE: 600000, // 10 minutes in milliseconds
    PRODUCT_INFO_STORAGE_KEY: 'mw_installed_products',
    EXPIRATION_TIME_STORAGE_KEY: 'mw_installed_products_expiration_time',

    /**
     * Gets information about the products the current user has installed
     * @param {string} baseCodeOrName - Optional. Product base code or name to filter by
     * @returns {Promise<Array>} Array of product objects with baseCode, name, release, installDate
     */
    getInstalledProductInfo: async function(baseCodeOrName) {
        const expirationTimeString = localStorage.getItem(this.EXPIRATION_TIME_STORAGE_KEY);
        let installedProducts;

        // Check if we have valid cached data
        if (expirationTimeString) {
            if (Date.now() < parseInt(expirationTimeString)) {
                const installedProductsString = localStorage.getItem(this.PRODUCT_INFO_STORAGE_KEY);
                if (installedProductsString) {
                    console.log('USV: Got installed products from cache');
                    installedProducts = JSON.parse(installedProductsString);
                }
            }
        }

        // If no valid cache, fetch from server
        if (!installedProducts) {
            installedProducts = await this._fetchInstalledProducts();
            
            // Cache the results if we got data
            if (installedProducts.length) {
                localStorage.setItem(this.PRODUCT_INFO_STORAGE_KEY, JSON.stringify(installedProducts));
                const expirationTime = Date.now() + this.CACHE_TIME_TO_LIVE;
                localStorage.setItem(this.EXPIRATION_TIME_STORAGE_KEY, '' + expirationTime);
            }
        }

        // Filter by specific product if requested
        if (installedProducts && baseCodeOrName) {
            const isTargetProduct = (product) => 
                product.baseCode === baseCodeOrName || product.name === baseCodeOrName;
            const index = installedProducts.findIndex(isTargetProduct);
            return index >= 0 ? [installedProducts[index]] : [];
        }

        return installedProducts || [];
    },

    /**
     * Returns true if the current user has installed the specified product
     * @param {string} baseCodeOrName - Product base code or name
     * @returns {Promise<boolean>} true if the specified product has been installed
     */
    isProductInstalled: async function(baseCodeOrName) {
        const productInfo = await this.getInstalledProductInfo(baseCodeOrName);
        return productInfo.length > 0;
    },

    /**
     * Internal method to fetch installed products from the server
     * @private
     * @returns {Promise<Array>} Array of installed products
     */
    _fetchInstalledProducts: async function() {
        const installedProducts = [];

        if (!checkLoginStatus()) {
            return installedProducts;
        }

        const userId = this._getUserId();
        if (!userId) {
            console.warn('USV: No user ID available for fetching license info');
            return installedProducts;
        }

        console.log('USV: Fetching installed products from server');
        const url = 'https://cdp.in.treasuredata.com/cdp/lookup/collect/segments?version=2&token=fdf89157-f2f7-4567-92aa-41431b2bf594&key.adobe_visitor_ids=' + userId;

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn('USV: server response code = ' + response.status);
                return installedProducts;
            }

            const bodyJson = await response.json();
            
            if (!this._isResponseBodyValid(bodyJson)) {
                console.warn('USV: server returned invalid body');
                return installedProducts;
            }

            const baseCodes = JSON.parse(bodyJson[0].attributes.product_base_codes);
            const names = JSON.parse(bodyJson[0].attributes.product_names);
            const releases = JSON.parse(bodyJson[0].attributes.releases);
            const installDates = JSON.parse(bodyJson[0].attributes.install_dates);

            if (baseCodes && names && releases && installDates) {
                for (let i = 0; i < baseCodes.length; i++) {
                    installedProducts.push({
                        baseCode: baseCodes[i],
                        name: names[i],
                        release: releases[i],
                        installDate: installDates[i]
                    });
                }
            }
        } catch (error) {
            console.error('USV: Error fetching installed products:', error);
        }

        return installedProducts;
    },

    /**
     * Validates the response body from the server
     * @private
     * @param {Object} bodyJson - The JSON response body
     * @returns {boolean} true if valid, false otherwise
     */
    _isResponseBodyValid: function(bodyJson) {
        return !!bodyJson && 
               bodyJson.length && 
               bodyJson[0] && 
               bodyJson[0].attributes &&
               bodyJson[0].attributes.product_base_codes && 
               bodyJson[0].attributes.product_names &&
               bodyJson[0].attributes.releases && 
               bodyJson[0].attributes.install_dates;
    },

    /**
     * Gets the Adobe Marketing Cloud Visitor ID
     * @private
     * @returns {string|undefined} The visitor ID
     */
    _getUserId: function() {
        if (window._satellite) {
            return window._satellite.getVisitorId().getMarketingCloudVisitorID();
        } else {
            return undefined;
        }
    },

    /**
     * Clears the cached product information
     * Useful for testing or forcing a refresh
     */
    clearCache: function() {
        localStorage.removeItem(this.PRODUCT_INFO_STORAGE_KEY);
        localStorage.removeItem(this.EXPIRATION_TIME_STORAGE_KEY);
        console.log('USV: Cache cleared');
    }
};

/**
 * Checks if user has R2025a or later MATLAB installed.
 * @returns {Promise<boolean|null>} 
 *   - true: User has required version and product
 *   - false: User does not have product or required version
 */
async function isOpenDesktopEnabled() {
    try {
        if (isMathWorksUser()) {
            return true;
        }

        const installedProducts = await InstallInfoHelper.getInstalledProductInfo();
        const matlabInstall = installedProducts.find(v => v.baseCode === 'ML');

        if (matlabInstall && matlabInstall.release && matlabInstall.release >= 'R2025a') {
            return true;
        }
        
        return false;
    } catch (error) {
        return false;
    }
}

/*
 * ca_dropDown class handles copying code blocks and MATLAB commands 
 * to the clipboard. It adds copy buttons and tooltips to selected DOM elements.
*/
class ca_dropDown {

    constructor(dropDown, i, j) {
        this.ca_codeResponsive = dropDown.closest('.code_responsive');
        this.ca_codeResponsive.addClass('-has_code_copy');
        this.codeInput = dropDown;
        this.ca_id = i.toString() + j.toString();
        this.ca_getSpanId = 'copy_popover_' + this.ca_id;
        this.ca_codeBlock = dropDown.find('pre');
    }

    /**
     * Creates a template from the CA_TEMPLATE constant
     * Sets the id of the span in the template to this.ca_getSpanId
     * Prepends the template to the codeInput element
     */
    ca_create_template() {
        let ca_cmdTemplate = $(CA_TEMPLATE);
        ca_cmdTemplate.find('span').attr('id', this.ca_getSpanId);
        this.codeInput.prepend(ca_cmdTemplate);
    }

    /**
     * Creates a template to copy the code block to the clipboard. 
     * Finds the copy button and sets its ID. 
     * Appends the template to the .copy_code element. 
     * Handles the click event to copy the code block to clipboard, 
     * show a tooltip confirmation, then destroy the tooltip after 750ms.
    */
    ca_createCopyCodeBlockTemplate() {
        let ca_cmdCopyCodeBlockTemplate = $(CA_COPY_CODE_BLOCK_TEMPLATE);
        let ca_copyCodeBlockButton = ca_cmdCopyCodeBlockTemplate.find('button');
        let ca_buttonId = 'copyBlock' + this.ca_id;
        let ca_localCodeResponsive = this.ca_codeResponsive;
        let ca_localGetSpanId = this.ca_getSpanId;
        let ca_localCodeBlock = this.ca_codeBlock;
        ca_copyCodeBlockButton.attr('id', ca_buttonId);
        this.codeInput.find('.copy_code').append(ca_cmdCopyCodeBlockTemplate);
        ca_copyCodeBlockButton.click(function () {
            navigator.clipboard.writeText(ca_localCodeBlock.text());
            ca_localCodeResponsive.addClass('-code_copied');
            const tooltip = new bootstrap.Tooltip($('#' + ca_localGetSpanId), {
                title: CA_COPY_CODE_BLOCK_CONFIRMATION_TOOLTIP,
                trigger: 'manual'
            });
            tooltip.show();
            setTimeout(function () {
                tooltip.dispose();
                ca_localCodeResponsive.removeClass('-code_copied');
            }, 750);
        });
    }

    /**
     * Creates a template to copy an MATLAB command for opening an example to the clipboard.
     * Finds the copy command button and sets its ID. Sets the input value to the MATLAB command.
     * Appends the template to the .copy_code element. Handles the click event to copy the command 
     * to clipboard, show a tooltip confirmation, then destroy the tooltip after 750ms.
     */
    ca_createCopyOpenExampleCommandTemplate(ca_MatLabcommand) {
        let ca_cmdCopyOpenExampleCommandTemplate = $(CA_COPY_OPEN_EXAMPLE_COMMAND_TEMPLATE);
        let ca_copyCommandButton = ca_cmdCopyOpenExampleCommandTemplate.find('button');
        let ca_buttonId = 'copyCommand' + this.ca_id;
        let ca_localGetSpanId = this.ca_getSpanId;
        ca_copyCommandButton.attr('id', ca_buttonId);
        ca_cmdCopyOpenExampleCommandTemplate.find('input').attr('value', ca_MatLabcommand);
        this.codeInput.find('.copy_code').append(ca_cmdCopyOpenExampleCommandTemplate);
        ca_copyCommandButton.click(function () {
            navigator.clipboard.writeText(ca_MatLabcommand);
            const tooltip = new bootstrap.Tooltip($('#' + ca_localGetSpanId), {
                title: CA_COPY_OPEN_EXAMPLE_COMMAND_CONFIRMATION_TOOLTIP,
                trigger: 'manual'
            });
            tooltip.show();
            setTimeout(function () {
                tooltip.dispose();
                ca_localCodeResponsive.removeClass('-code_copied');
            }, 750);
        });
    }
}

/**
 * OpenExampleLink
 * 
 * This class handles the processing of "Open Live Example" links on the page. 
 * It extracts the MATLAB command from the link, determines if the example 
 * is a Live Script or Model, removes the link in web context, and adds a 
 * copy button with the command.
 */
class OpenExampleLink {

    /**
     * Constructor for OpenExampleLink class
     * 
     * @param {Object} openLink - jQuery object representing the "Open Live Example" link
     * @param {string} docCenterType - Either "web" or "product" indicating doc context
     * 
     * Initializes properties like matlabCommand, isLiveScript, isModel based on 
     * attributes of the link. Also stores parent div, and conditionally removes
     * the link if in web or system browser context.
     */
    constructor(openLink, docCenterType) {
        let href = openLink.attr('href');
        let systemBrowser = inSystemBrowser();
        this.matlabCommand = getMatlabCommand(href);
        let dataAttr = openLink.attr('data-ex-genre');
        this.isLiveScript = dataAttr && dataAttr === 'Live Script';
        this.isModel = dataAttr && dataAttr === 'Model';

        this.parentDiv = openLink.parent();
        this.parentDiv.addClass('open_example_div');
        if (docCenterType === 'web' || systemBrowser) {
            openLink.remove();
        }
    }

    /**
     * Returns the MATLAB command stored on this object.
     */
    returnMatlabCommand() {
        return this.matlabCommand;
    }

    /**
     * Returns whether this example link is for a Model (true) or not (false).
     */
    returnIsModel() {
        return this.isModel;
    }

    /**
     * Returns whether this example link is for a Live Script (true) or not (false).
     */
    returnIsLiveScript() {
        return this.isLiveScript;
    }

    /**
     * Creates a copy button with the MATLAB command 
     * decoded and set in the data-bs-content attribute.
     * Appends the button to the parent div, initializes
     * the popover, and registers the click handler.
     */
    createCopyButton() {
        this.parentDiv.append(copyButtonTemplate);
	    let cmdBtn = this.parentDiv.find('button.copy_cmd_btn').last();
        let decodedCmd = decodeURIComponent(this.matlabCommand);
        decodedCmd = swapSingleToDoubleQuotes(decodedCmd)
        cmdBtn.attr('data-bs-content', `<code>${decodedCmd}</code>`);
        cmdBtn.attr('data-bs-html', 'true');
        cmdBtn.attr('data-bs-title', 'MATLAB Command');
        new bootstrap.Popover(cmdBtn[0]);
        cmdBtn.click(handleExampleCommandClick);
    }

}

/**
 * Event handlers to initialize Doc Center contextual elements (OpenWith, Highlighting, Doc Video Transcripts)
 *
 * This runs when both the OpenWith API and DOM are ready. It registers the dialog popup handler 
 * for "Open in..." links, and handles updating example affordances depending
 * on whether we are in web vs. product doc context.
 * 
 * Other handlers (highlighting, video transcript) execute when all page resources have finished loading
 */
window.addEventListener('owReady', function() {
    owReadyFired = true;
    if (document.readyState !== 'loading') {
        initOpenInButtons();
    }
});

window.addEventListener('DOMContentLoaded', function() {
    if (getDocCenterType() === 'web' && owReadyFired) {
        initOpenInButtons();
    } else if (getDocCenterType() === 'product') {
        initOpenInButtons();
    }
});

window.addEventListener('load', function() {
    const locale = document.documentElement.lang.toLowerCase();
    const hasDocVideo = document.querySelector('.doc_video_container') !== null;

    // If the page has a code block to highlight, initialize the highlight.js library
    if(document.querySelector('code[class^="language-"], code[class*=" language-"]')) {
		initHighlight();
	}
    // If we are looking at Installed Doc using the System Browser, add the Copy button
    if(getDocCenterType() === 'product' && inSystemBrowser()) {
        insertCopyLink( 'icon-mw-copy');
    }
    // If the page has a Doc Video and is in English, initialize the 3Play-Brightcove transcript plug-in
    if (locale === 'en' && hasDocVideo) {
        initBrightcoveTranscript();
    }
});

function initOpenInButtons() {
    const docCenterType = getDocCenterType();
    const matlabMobile = isMatlabMobile();

    let copyIcon = 'icon-copy';
    if (docCenterType === 'product') {
        copyIcon = 'icon-mw-copy';
    }
    COPY_COMMAND_BUTTON = getLocalizedString("copy_command");
    CA_GET_DROP_DOWN_TEXT = getLocalizedString("ca_get_drop_down_text");
    CA_COPY_CODE_BLOCK_BUTTON_TEXT = getLocalizedString("ca_copy_code_block_button_text");
    CA_COPY_OPEN_EXAMPLE_COMMAND_TEXT = getLocalizedString("ca_copy_open_example_command_text");
    CA_OPEN_EXAMPLE_COMMAND_INSTRUCTION = getLocalizedString("ca_open_example_command_instruction");
    CA_COPY_CODE_BLOCK_CONFIRMATION_TOOLTIP = getLocalizedString("ca_copy_code_block_confirmation_tooltip");
    CA_COPY_OPEN_EXAMPLE_COMMAND_CONFIRMATION_TOOLTIP = getLocalizedString("ca_copy_open_example_command_confirmation_tooltip");
    copyButtonTemplate = '<div class="d-grid">' + '<button type="button" class="btn companion_btn btn_color_blue btn-outline copy_cmd_btn" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-trigger="hover focus" title="" data-bs-html="true" data-bs-content="" data-original-title="MATLAB Command">' + `<span class="${copyIcon}">` + '<span class="visually-hidden">Copy Code</span></span>&nbsp; ' + COPY_COMMAND_BUTTON + '</button>' + '</div>';
    if (!matlabMobile) {
        registerMatlabCommandDialogAction();
        exampleAffordanceHandler(docCenterType);
    }
}

// If the video has a transcript, show the transcript accordion
function initBrightcoveTranscript() {
	var transcriptTarget = document.querySelector('.p3sdk-interactive-transcript-component');
	var transcriptAccordion = document.getElementById('collapse-video_transcript');
	
	if (transcriptTarget && transcriptAccordion) {
		transcriptAccordion.classList.remove('d-none');
	}
}

function initHighlight() {
	hljs.configure({ cssSelector: 'pre code[class^="language-"]' });
	hljs.highlightAll();
}

/**
 * Registers click handler for "Open in MATLAB" links without MATLAB support. 
 * When one of these links is clicked, the default action is prevented, 
 * the MATLAB command is extracted from the link href, and a dialog is shown
 * to display the command.
 */
$(window).on('popover_added', function () {
    $(document).on("click", ".no-matlab", function (e) {
        e.preventDefault();
        let href = $(this).attr('href');
        let matlabCommand = getMatlabCommand(href);
        showMatlabDialog(matlabCommand);
    });
});

/**
 * Handler for the examples_cards_added event.
 * Hides any links in .mw_card elements that start with "matlab:" 
 * when the event fires.
 */
$(window).bind('examples_cards_added', function (e) {
    $('.mw_card a[href^="matlab:"]').hide();
});

/**
 * Gets the DocCenter type from the page.
 * Searches through all script tags to find one that assigns 
 * the doccentertype variable. Returns the assigned value if found,
 * otherwise returns null.
 */
function getDocCenterType() {
    // Get all script tags in the document
    const scripts = document.getElementsByTagName('script');

    // Regular expression pattern to find the doccentertype variable assignment
    const pattern = /doccentertype\s*=\s*"(.*?)";/;

    // Iterate over all scripts to find the one that contains the doccentertype variable
    for (let i = 0; i < scripts.length; i++) {
        let scriptContent = scripts[i].textContent || scripts[i].innerText;
        // Check if the script contains the doccentertype variable
        if (pattern.test(scriptContent)) {
            // Extract the value of doccentertype
            let matches = pattern.exec(scriptContent);
            if (matches && matches[1]) {
                return matches[1]; // Return the value of doccentertype
            }
        }
    }
    // Return null if doccentertype is not found
    return null;
}

/**
 * Checks if the current page is local and loaded in System Browser.
 * 
 * Checks the current hostname against a regular expression for IPv4 addresses.
 * Also checks if the Help Browser session storage key exists.
 * 
 * @returns {boolean} True if loaded in the System Browser, false otherwise.
 */
function inSystemBrowser() {
    const currentHostname = window.location.hostname;
    const helpBrowserSessionStorageKey = sessionStorage.getItem("help_browser_container");

    // Regular expression to match IPv4 addresses
    const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;

    // Check if the hostname matches the IPv4 pattern and if help_browser_container does not exist
    if (ipv4Pattern.test(currentHostname) && helpBrowserSessionStorageKey === null) {
        return true;
    }

    // If neither, it's likely Web or CEF help browser
    return false;
}

/**
 * Check if the context is MATLAB Mobile.
 * If so, retain the original/built-in Help Browser Open behavior
 */
function isMatlabMobile() {
    const url = new URL(window.location.href);
    // Get the search parameters from the URL
    const params = new URLSearchParams(url.search);

    // Check if the URL contains the MATLAB Mobile params
    return params.has('browser') && params.get('browser') === 'F1help' &&
        params.has('category') && params.get('category') === 'matlab-mobile-fundamentals';
}

/**
 * Hides the open example action links if loaded in System Browser.
 * Gets whether the page is loaded in System Browser using inSystemBrowser().
 * If true, finds all matlab: links within the mw_card_footer div 
 * and sets their display style to 'none' to hide them.
 */
function hideExampleCardLinks() {
    let systemBrowser = inSystemBrowser();

    if (systemBrowser) {
        const cardActionLinkElements = document.querySelectorAll('div.mw_card_footer > ul > li > a[href*="matlab:"]');
        cardActionLinkElements.forEach(element => {
            element.style.display = 'none';
        });
    }
}

/**
 * Handles updating example affordances based on DocCenter context.
 * In web context, updates buttons to use OpenWith and latest icon set.
 * In product context, adds copy button and uses legacy icon set.
 * Conditionally updates affordance templates and calls handler 
 * functions to update buttons.
 */
function exampleAffordanceHandler(docCenterType) {
    const openExampleButtons = $('.examples_short_list a[href^="matlab:"]').not('.example_product_list a[href^="matlab:"]');
    // Do nothing if we are not in web or product context
    if (docCenterType !== null) {
        // If we are in web, update buttons based on OpenWith and use latest icon set
        if (docCenterType === 'web') {
            CA_TEMPLATE = '<div class="btn-group code_actions"> <button type="button" class="btn btn-default dropdown-toggle" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <span class="copy_code_popover_target"><span class="icon-copy"></span> ' + CA_GET_DROP_DOWN_TEXT + ' <span class="caret"></span></span></button><ul class="dropdown-menu dropdown-menu-right copy_code"></ul></div>';
            CA_COPY_CODE_BLOCK_TEMPLATE = '<li class="copy_code_block"><button><span class="icon-copy"></span> ' + CA_COPY_CODE_BLOCK_BUTTON_TEXT + '</button></li>';
            CA_COPY_OPEN_EXAMPLE_COMMAND_TEMPLATE = '<li aria-hidden="true"><hr class="dropdown-divider"></li><li class="copy_code_openexample"><p><span class="icon-webinar"></span> ' + CA_COPY_OPEN_EXAMPLE_COMMAND_TEXT + '<br><small>' + CA_OPEN_EXAMPLE_COMMAND_INSTRUCTION + '</small></p><div role="presentation" class="input-group add_margin_0"><input type="text" class="form-control" readonly/><span><button class="btn btn_color_blue" type="button"><span class="icon-copy"><span class="visually-hidden">Copy</span></span></button></span></div></li>';
            webDocButtonHandler(openExampleButtons);
            // Else assume we are in product and only add copy button and use legacy icon set
        } else {
            CA_TEMPLATE = '<div class="btn-group code_actions"> <button type="button" class="btn btn-default dropdown-toggle" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <span class="copy_code_popover_target"><span class="icon-mw-copy"></span> ' + CA_GET_DROP_DOWN_TEXT + ' <span class="caret"></span></span></button><ul class="dropdown-menu dropdown-menu-right copy_code"></ui></div>';
            CA_COPY_CODE_BLOCK_TEMPLATE = '<li class="copy_code_block"><button><span class="icon-mw-copy"></span> ' + CA_COPY_CODE_BLOCK_BUTTON_TEXT + '</button></li>';
            CA_COPY_OPEN_EXAMPLE_COMMAND_TEMPLATE = '<li aria-hidden="true"><hr class="dropdown-divider"></li><li class="copy_code_openexample"><p><span class="icon-webinar"></span> ' + CA_COPY_OPEN_EXAMPLE_COMMAND_TEXT + '<br><small>' + CA_OPEN_EXAMPLE_COMMAND_INSTRUCTION + '</small></p><div role="presentation" class="input-group add_margin_0"><input type="text" class="form-control" readonly/><span><button class="btn btn_color_blue" type="button"><span class="icon-mw-copy"><span class="visually-hidden">Copy</span></span></button></span></div></li>';
            updateButtons(openExampleButtons, docCenterType)
        }
    }
}

/**
 * Handles updating example affordances for web doc context.
 * Checks if OpenWith APIs are available, product is not MATLAB Mobile, products required by example are supported in MATLAB Online/MATLAB Mobile and user has required version of MATLAB installed.
 * If so, updates buttons to use OpenWith API.
 * If products required by example are not supported, resets buttons.
 * @param {Element[]} openExampleButtons - Array of open example buttons
 */
async function webDocButtonHandler(openExampleButtons) {
    const currentUrl = window.location.href;
    const examplesShortList = document.getElementsByClassName("examples_short_list");
    let exampleProductBaseCodes;
    // Don't produce array of base codes if example_short_list does not exist
    if (examplesShortList[0]) {
        exampleProductBaseCodes = examplesShortList[0].getAttribute("data-products").split(' ');
    }
    // Update buttons if examples_short_list exists on page, openWith APIs are available, and if the page is not matlabmobile (g2692411) and user has required version of MATLAB installed.
    if (examplesShortList[0] && window.ow !== undefined && ow.isProductSupported !== undefined && window.mwDocMetadata !== undefined && !currentUrl.includes('matlabmobile')) {
        const isLoggedIn = checkLoginStatus();
        // isProductSupportedInMO checks if products required by example are supported in MATLAB Online/MATLAB Mobile
        // hasRequiredMATLAB checks if user has required MATLAB version for "Open In Desktop".
        const [isProductSupportedInMO, hasRequiredMATLAB] = await Promise.all([
            callOW(exampleProductBaseCodes, ow.isProductSupported),
            isLoggedIn ? isOpenDesktopEnabled() : Promise.resolve(null)
        ]);

        updateButtons(openExampleButtons, 'web', isProductSupportedInMO, hasRequiredMATLAB);
    } else {
        resetButtons(openExampleButtons);
    }
}

/**
 * Calls the openWith API to check if the given array of product 
 * basecodes are supported. Loops through each basecode, calls 
 * the API to check if it's supported, and returns false if any 
 * are not supported. Otherwise returns true.
 * 
 * @param {string[]} baseCodeArr - Array of product basecodes
 * @param {Function} owAPI - OpenWith API function that checks if a product is supported
 * @returns {Promise<boolean>} - Promise resolving to true if all products are supported, false otherwise
*/
async function callOW(baseCodeArr, owAPI) {
    for (const value of baseCodeArr) {
        const isSupported = await owAPI([value]);
        if (!isSupported.exists) {
            return false;
        }
    }
    return true;
}

/**
 * Resets Open Example buttons by removing any added functionality.
 * 
 * Loops through a set of Open Example buttons and does the following:
 * - Gets related code blocks
 * - Creates OpenExampleLink objects to extract info from buttons  
 * - Creates dropdown menus for code blocks
 * - Adds copy code and open example commands to menus
 */
function resetButtons(openExampleButtons) {
    $.each(openExampleButtons, function (i) {
        let ca_codeInputBlocks = $(this).closest('.examples_short_list').parent().find('.code_responsive div[class="codeinput"]');
        let newLink = new OpenExampleLink($(this), 'web');
        newLink.createCopyButton();
        let ca_MatLabcommand = newLink.returnMatlabCommand();
        $.each(ca_codeInputBlocks, function (j) {
            let ca_newDropDown = new ca_dropDown($(this), i, j);
            ca_newDropDown.ca_create_template();
            ca_newDropDown.ca_createCopyCodeBlockTemplate();
            ca_newDropDown.ca_createCopyOpenExampleCommandTemplate(ca_MatLabcommand);
        });
    });
}

/**
 * Updates Open Example buttons for code examples to enable/disable them
 * and add "Open in..." functionality based on whether the documentation
 * center is a web doc.
 * 
 * Loops through a set of Open Example buttons and does the following:
 * - Gets related code blocks 
 * - Creates OpenExampleLink objects to extract info from buttons
 * - Creates new dropdown menus for code blocks
 * - Conditionally creates Open Example buttons for web docs
 * - Updates button text and state based on license status
 */
function updateButtons(openExampleButtons, docCenterType, isProductSupportedInMO, hasRequiredMATLAB) {
    $.each(openExampleButtons, function (i) {
        let ca_codeInputBlocks = $(this).closest('.examples_short_list').parent().find('.code_responsive div[class="codeinput"]');
        let ca_openExampleButtonParentDiv = ($(this)).parent();
        let newLink = new OpenExampleLink($(this), docCenterType);
        newLink.createCopyButton();
        let ca_MatLabcommand = newLink.returnMatlabCommand();
        let ca_isModel = newLink.returnIsModel();
        // If Web doc, then create "Open in..." button
        if (docCenterType === 'web') {
            createOpenExampleButton(ca_MatLabcommand, ca_isModel, ca_openExampleButtonParentDiv, true, isProductSupportedInMO, hasRequiredMATLAB);
        }
        $.each(ca_codeInputBlocks, function (j) {
            let ca_newDropDown = new ca_dropDown($(this), i, j);
            ca_newDropDown.ca_create_template();
            ca_newDropDown.ca_createCopyCodeBlockTemplate();
            ca_newDropDown.ca_createCopyOpenExampleCommandTemplate(ca_MatLabcommand);
            let ca_openExampleLinkParentDiv = ($(this)).find('.copy_code');
            // If Web doc, then create "Open in..." button
            if (docCenterType === 'web') {
                createOpenExampleButton(ca_MatLabcommand, ca_isModel, ca_openExampleLinkParentDiv, false, isProductSupportedInMO, hasRequiredMATLAB);
            }
        });
    });
}

/**
 * Invokes the open with action on MATLAB installed, web, mobile app.
 * @param {string} action - The action to perform (e.g. "openexample").
 * @param {string} exampleCommand - The example name (e.g., "matlab/SomeExample").
 * @param {string} targetPlatform - Specific targetPlatform (web/desktop) for the action.
 * @param {string} targetApplication - Specific targetApplication (MATLAB) for the action.
 * @param {string[]} versionSpec - Specific MATLAB version or version constraints to target.
 * @returns {void}
 */
function openInMATLAB(action, exampleCommand, targetPlatform, targetApplication, versionSpec = undefined) {
    const owData = {
        type: action,
        arguments: [exampleCommand],
        targetPlatform,
        targetApplication
    };

    if(versionSpec != null) {
        owData.versionSpec = versionSpec;
    }

    ow.invokeAction(owData);
}

/**
 * Creates an "Open Example" button that opens the example specified by ca_MatLabcommand.
 * Configures the button text, styling, click handler etc.
 * based on the example type (ca_isModel) and whether it should be a button 
 * or menu item (isButton). Inserts the button in the DOM at ca_parentDiv.
 * 
 * @param {string} ca_MatLabcommand - The MATLAB command that opens the example
 * @param {boolean} ca_isModel - Whether the example is a model
 * @param {jQuery} ca_parentDiv - The parent element to insert the button in 
 * @param {boolean} isButton - Whether to create a button (true) or menu item (false)
 * @param {boolean} isProductSupportedInMO - Whether the product is supported on MATLAB online or mobile app
 * @param {boolean} hasRequiredMATLAB - Whether the user has the required version of desktop MATLAB for "Open In Installed MATLAB"
 */
function createOpenExampleButton(ca_MatLabcommand, ca_isModel, ca_parentDiv, isButton, isProductSupportedInMO, hasRequiredMATLAB) {
    const openWithCommand = getOpenWithCommand(ca_MatLabcommand);

    const archivedDoc = isArchivedDoc();
    const isMobile = isMobileDevice(); // Check device type
    const exampleVersionSpec = getExampleVersionSpec();
    
    const openWithLabel = new getOpenWithDropdownLabel(ca_isModel, isMobile);
    const openWithLabelStr = openWithLabel.getString();

    const openWithOnlineLabel = new getOpenWithOnlineLabel(ca_isModel);
    const openWithOnlineLabelStr = openWithOnlineLabel.getString();

    const openWithInstalledLabel = new getOpenWithInstalledLabel(ca_isModel);
    const openWithInstalledLabelStr = openWithInstalledLabel.getString();

    let openExampleButtonMarkup = null; // "Open in" button's HTML structure

    if (isButton) {
        openExampleButtonMarkup = handleOpenExampleButton(archivedDoc, isMobile, isProductSupportedInMO, hasRequiredMATLAB, openWithLabelStr, openWithOnlineLabelStr, openWithInstalledLabelStr);
    } else {
        openExampleButtonMarkup = handleGetMenuItemButton(archivedDoc, isMobile, isProductSupportedInMO, openWithLabelStr, openWithOnlineLabelStr);
    }

    // prepend if markup exists
    if (openExampleButtonMarkup) {
        if(isButton){
            ca_parentDiv.prepend(openExampleButtonMarkup);
        } else { 
            ca_parentDiv.append(openExampleButtonMarkup);
        }
    }

    // Handle "Open in MATLAB Online" / Single Mobile Button (both use js-open-web-example)
    ca_parentDiv.find('.open-web-example').on('click', function(e) {
        e.preventDefault();
        openInMATLAB(openExampleAction, openWithCommand, webMATLABTargetPlatform, owTargetApplication);
    });

    // Handle "Open in Installed MATLAB" / Single Desktop Button (both use js-open-desktop-example)
    ca_parentDiv.find('.open-desktop-example').on('click', function(e) {
        e.preventDefault();
        openInMATLAB(openExampleAction, openWithCommand, installedMATLABTargetPlatform, owTargetApplication, exampleVersionSpec);
    });
}

function handleOpenExampleButton(archivedDoc, isMobile, isProductSupportedInMO, hasRequiredMATLAB, openWithLabelStr, openWithOnlineLabelStr, openWithInstalledLabelStr) {
    const isLoggedIn = checkLoginStatus();

    if (archivedDoc) {
        if (isMobile) {
            return null; // Archived doc on mobile: no button
        }
        // Archived doc on desktop: Show "Open in Installed MATLAB" if user has required MATLAB installed
        if (isLoggedIn && hasRequiredMATLAB === true) {
            return createSingleButton(
                openWithInstalledLabelStr,
                "openInInstalledMATLABExampleButton",
                "open-desktop-example"
            );
        }
        return null;
    }

    // Current doc on mobile
    if (isMobile) {
        if (isLoggedIn && isProductSupportedInMO) {
            // Mobile with product support: web button
            return createSingleButton(
                openWithLabelStr,
                "openInMobileExampleButton",
                "open-web-example"
            );
        }
        // Mobile without product support: no button
        return null;
    }

    // Current doc on desktop
    // Both MATLAB Online and Installed MATLAB are available
    if (isProductSupportedInMO && isLoggedIn && hasRequiredMATLAB === true) {
        return createDropdownButton(
            openWithLabelStr,
            openWithOnlineLabelStr,
            openWithInstalledLabelStr
        );
    }

    // Only MATLAB Online is available
    if (isProductSupportedInMO) {
        return createSingleButton(
            openWithOnlineLabelStr,
            "openInMATLABOnlineExampleButton",
            "open-web-example"
        );
    }

    // Only Installed MATLAB is available
    if (isLoggedIn && hasRequiredMATLAB === true) {
        return createSingleButton(
            openWithInstalledLabelStr,
            "openInInstalledMATLABExampleButton",
            "open-desktop-example"
        );
    }

    return null;
}

function handleGetMenuItemButton(archivedDoc, isMobile, isProductSupported, openWithLabelStr, openWithOnlineLabelStr) {
    if (archivedDoc) {
        return null; // Archived doc don't get menu items
    }
    if (!isProductSupported) {
        return null; // Current doc without product support - no menu item
    }
    if (isMobile) {
        // Current doc on mobile browser
        return createGetListItem(openWithLabelStr, "open-web-example");
    } 

    return createGetListItem(openWithOnlineLabelStr, "open-web-example"); // Current doc on desktop
}

/**
 * Registers a click handler on the given link to open a modal dialog.
 * Extracts the MATLAB command from the link's href and passes it to 
 * showMatlabDialog() to display in the dialog.
 * 
 * @param {jQuery} link - The link to register the click handler on
 */
function addOpenExampleLinkClickHandler(link) {
    $(link).on('click', function (e) {
        e.preventDefault();
        let href = $(this).attr('href');
        let matlabCommand = getMatlabCommand(href);
        showMatlabDialog(matlabCommand);
    });

}

/**
 * Registers click handlers on links with matlab: hrefs to open a modal dialog. 
 * Extracts the MATLAB command from the href and passes it to the modal dialog.
 */
function registerMatlabCommandDialogAction() {
    $('a[href^="matlab:"]').on('click', function (e) {
        e.preventDefault();
        let href = $(this).attr('href');
        let matlabCommand = getMatlabCommand(href);
        showMatlabDialog(matlabCommand);
    });
}

/**
 * Extracts the MATLAB command from a MATLAB href string.
 * 
 * @param {string} href - The MATLAB href string
 * @returns {string} The MATLAB command extracted from the href
 */
function getMatlabCommand(href) {
    let matlabCommand = null;
    let match = href.match(/matlab:(.*)/);
    if (match) {
        matlabCommand = match[1];
    }
    matlabCommand = swapSingleToDoubleQuotes(matlabCommand)
    return matlabCommand;
}

/**
 * Extracts the openExample command from a MATLAB command string.
 * 
 * @param {string} matlabCommand - The MATLAB command string
 * @returns {string} The openExample command extracted from the MATLAB command, or null if not found
 */
function getOpenWithCommand(matlabCommand) {
    let openWithCommand = null;
    let match = matlabCommand.match(/openExample\("(.*)"\)/);
    if (match) {
        openWithCommand = match[1];
    }
    return openWithCommand;
}

/**
 * Opens a modal dialog to display the given MATLAB command.
 * Inserts the modal HTML, if it does not already exist.
 * 
 * @param {string} matlabCommand - The MATLAB command to display in the dialog.
 */
function showMatlabDialog(matlabCommand) {
    // If we haven't already, get the localized MATLAB dialog modal into the DOM
    if (!document.getElementById('matlab-command-dialog')) {
        insertMatlabDialog();
    }

    // Update the MATLAB dialog modal command content and display
    if (matlabCommand) {
        matlabCommand = decodeURIComponent(matlabCommand);
        $("#matlab-command-dialog #dialog-body #dialog-matlab-command").text(matlabCommand);
    } else {
        $("#matlab-command-dialog #dialog-body #dialog-matlab-command").hide();
    }
    let matlabCommandDiv = document.getElementById('matlab-command-dialog');
    let matlabCommandModal = new bootstrap.Modal(matlabCommandDiv);
    matlabCommandModal.show();
}

// Construct MATLAB Dialog Modal and insert into DOM
function insertMatlabDialog() {
    const matlabDialogModalContent = `<div class="modal fade" id="matlab-command-dialog" tabindex="-1" role="dialog" aria-labelledby="matlabCommandDialogLabel" aria-hidden="true"><div class="modal-dialog modal-lg""><div class="modal-content"><div class="modal-header"><h2 class="modal-title">${getLocalizedString('matlab_command')}</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body" id="dialog-body"><p>${getLocalizedString('matlab_dialog_body')}</p><pre id="dialog-matlab-command"></pre><p>${getLocalizedString('matlab_dialog_cta')}</p></div><div class="modal-footer"><button type="button" class="btn btn_color_blue" data-bs-dismiss="modal">${getLocalizedString('close')}</button></div></div></div></div>`;

    const matlabDialogModalContainer = document.createElement('div');
    matlabDialogModalContainer.innerHTML = matlabDialogModalContent;

    const mainElement = document.querySelector('main');
    mainElement.appendChild(matlabDialogModalContainer);
}

/**
 * Handles clicks on "Open Example" buttons by copying example code to the clipboard.
 * @param {Event} evt - The click event on the "Open Example" button.
 */
function handleExampleCommandClick(evt) {
    const elt = evt.target.closest('button.btn_color_blue');

    const popoverId = elt.getAttribute('aria-describedby');
    const popover = document.getElementById(popoverId);
    if (popover) {
        const contentElt = popover.querySelector('.popover-body');
        const textToCopy = contentElt.textContent;
        const n = contentElt.getBoundingClientRect().top + window.scrollY

        /** 
         * By default the copy_to_clipboard function will close the popover when it
         * selects the text to copy, so temporarily reject the hide popover event. 
        */
        $(elt).on('hide.bs.popover', keepPopoverOpen);
        if (copy_to_clipboard(textToCopy, n)) {
            contentElt.classList.add('open_example_highlight');
            const copiedElt = createCopiedTextElt(popover);
            if (copiedElt) {
                // Clean up when the popover closes.
                $(elt).one('hide.bs.popover', function () {
                    contentElt.classList.remove('open_example_highlight');
                    copiedElt.remove();
                });
            }
        }
        $(elt).off('hide.bs.popover', keepPopoverOpen);
    }
}

/**
 * Prevents hiding of a popover when the copy to clipboard action occurs, 
 * so the "Copied!" indicator can be displayed without the popover 
 * disappearing too soon.
 * 
 * @param {Event} evt - The Bootstrap hide event.
 */
function keepPopoverOpen(evt) {
    evt.preventDefault();
    return false;
}

/**
 * Creates a "Copied!" indicator element in the popover.
 * 
 * @param {Element} popoverElt - The popover element to add the indicator to.
 * @returns {Element|null} The indicator element if created, null if one already exists.
 */
function createCopiedTextElt(popoverElt) {
    let copiedTextElt = popoverElt.querySelector('.copied_message');
    if (copiedTextElt) {
        // The Copied! indicator already exists.
        return null;
    }
    const copiedElt = document.createElement('div');
    copiedElt.classList.add('copied_message');
    copiedElt.style.float = 'right';
    copiedElt.innerHTML = 'Copied!';
    popoverElt.querySelector('.popover-header').appendChild(copiedElt);
    return copiedElt;
}

/**
 * Copies text to the clipboard by creating a textarea, writing the text to 
 * it, selecting it, and executing the browser's copy command.
 * 
 * @param {string} text - The text to copy to the clipboard
 * @param {number} n - Vertical position to place the textarea
 * @returns {boolean} True if the copy succeeded, false otherwise
 */
function copy_to_clipboard(text, n) {
    let res;
    if (window.clipboardData) {
        // For IE
        text = text.replace(/(\r\n)+/g, "\r\n");
        res = window.clipboardData.setData('Text', text);
        return res;
    } else {
        let textArea = document.createElement("textarea");
        textArea.value = text; // For Edge to not shift focus away

        textArea.setAttribute("readonly", "");
        textArea.style.top = n + "px";
        textArea.style.margin = "0";
        textArea.style.padding = "0";
        textArea.style.position = "absolute";
        document.body.appendChild(textArea);
        textArea.select();
        try {
            res = document.execCommand('copy');
            document.body.removeChild(textArea);
            return res;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

// When in Installed Doc, in System Browser, provide a way to copy a link or command to open the doc
function insertCopyLink(copyIcon) {
    // Find the <nav> element with id "subnav"
    const subnavElement = document.getElementById('subnav');
    const currentUrl = window.location.href;
    // Split the pathname to get the part after '/help/'
    const docPagePath = currentUrl.split('/help/');
    const docSearchForm = document.getElementById('docsearch_form');
    const dataRelease = docSearchForm.getAttribute('data-release');
    const pageURL = `https://www.mathworks.com/help/releases/${dataRelease}/${docPagePath[1]}`;
    let matlabCommand = `web(fullfile(docroot,'${docPagePath[1]}'))`;

    if (docPagePath[1].includes('documentation-center.html')) {
        matlabCommand = `doc`;
    }

    const shareLinkButton = `
    <div id="crux_share" class="dropdown d-flex justify-content-end">
    <a href="#" id="crux_share_button" class="btn btn_color_blue companion_btn dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"> <p id="shareToolTipTarget" data-bs-placement="top" aria-hidden="true" class="mb-0"></p><span class="icon-link icon_16"><span class="visually-hidden">Share</span></span> Share<span class="caret"></span></a>
    <ul class="dropdown-menu">
            <li>
                <p><span class="${copyIcon}"></span> Copy Web URL</p>
                <div role="presentation" class="input-group">
                    <p class="form-control" id="page-url-copy">${pageURL}</p>
                    <span><button onclick="copyPageAddress('page-url-copy')" class="btn btn_color_blue" type="button" id="copy-command-url" title="Copy URL to Clipboard"><span class="${copyIcon}"><span class="visually-hidden">Copy URL to Clipboard</span></span></button></span>
                </div>
            </li>
            <li role="separator" aria-hidden="true" class="dropdown-divider"/>
            <li>
                <p><span class="icon-webinar"></span> Copy Command<br><small>To open this page using MATLAB, run:</small></p>
                <div role="presentation" class="input-group">
                    <p class="form-control" id="matlab-command-copy">${matlabCommand}</p>
                    <span><button onclick="copyPageAddress('matlab-command-copy')" class="btn btn_color_blue" type="button" id="copy-command-matlab" title="Copy Command to Clipboard"><span class="${copyIcon}"><span class="visually-hidden">Copy MATLAB Command to Clipboard</span></span></button></span>
                </div>
            </li>
        </ul>
    </div>`;

    // Check if the subnavElement exists, if not then float before main content
    if (subnavElement) {
        // Insert the new element after the <nav> element
        subnavElement.insertAdjacentHTML('afterend', shareLinkButton);
    } else {
        const mainElement = document.getElementById('skip_link_anchor');
        mainElement.insertAdjacentHTML('beforebegin', shareLinkButton);
    }
}

function copyPageAddress(copyID) {
    const copyData = document.getElementById(copyID).textContent;

    // Use the modern clipboard API, if available, or fallback to older method
    if (navigator.clipboard) {
        navigator.clipboard.writeText(copyData);
        showShareTooltip();
    } else {
        // Create a temporary input element to hold the URL, append, copy, and remove
        const tempInput = document.createElement('input');
        tempInput.value = copyData;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        showShareTooltip();
    }

}

function showShareTooltip() {
    const element = document.getElementById('shareToolTipTarget');
    if (!element) return;

    element.setAttribute('data-bs-original-title', 'Copied!');

    // Check if a tooltip instance already exists
    let tooltip = bootstrap.Tooltip.getInstance(element);
    if (!tooltip) {
        tooltip = new bootstrap.Tooltip(element);
    }
    tooltip.show();

    // Destroy the tooltip after a short delay
    setTimeout(() => {
        tooltip.dispose();
        element.removeAttribute('data-bs-original-title'); // Clean up attribute
    }, 750); // Adjust the delay as needed
}

function getOpenWithContainerOptions() {
    const containerOpts = {
        containerType: "external"
    };
    return containerOpts;
}

function getOpenWithDropdownLabel(isModel, isMobile) {
    this.getString = function () {
        if (isMobile) {
            return getLocalizedString("open_in_matlab");
        } 

        if (isModel) {
            return getLocalizedString("open_in_simulink");
        } else {
            return getLocalizedString("open_in_matlab");
        }
    }
}

function getOpenWithOnlineLabel(isModel) {
    this.getString = function () {
        if (isModel) {
            return getLocalizedString("open_in_simulink_online");
        } else {
            return getLocalizedString("open_in_matlab_online");
        }
    }
}

function getOpenWithInstalledLabel(isModel) {
    this.getString = function () {
        if (isModel) {
            return getLocalizedString("open_in_simulink_installed");
        } else {
            return getLocalizedString("open_in_matlab_installed");
        }
    }
}

/**
 * Checks whether the user agent is a mobile device.
 * @returns {boolean} True if a mobile device is detected; otherwise false.
 */
function isMobileDevice() {
    const toMatch = [
            /Android/i,
            /iPhone/i
        ];
    return toMatch.some((toMatchItem) => {
        return navigator.userAgent.match(toMatchItem);
    });
}

/**
 * Retrieves MATLAB example metadata
 * @param {string} key - The metadata property to retrieve
 * @param {*} defaultValue - Value to return if property doesn't exist
 * @return {*} The metadata value or defaultValue if not found
 */
function getDocMetadata(key, defaultValue = undefined) {
    // Check if data object exists on window
    if (typeof window.mwDocMetadata === 'undefined') {
        console.error('Doc meta data unavailable');
        return defaultValue;
    }
    
    return key in window.mwDocMetadata ? window.mwDocMetadata[key] : defaultValue ;
}

/**
 * Retrieves the version spec meta data for the example
 * @returns {[]string} The example version spec.
 */
function getExampleVersionSpec() {
    return getDocMetadata("exampleVersionSpec");
}

/**
 * Determine logged-in status of user.
 * @returns {boolean} True if the user is logged in, else false.
 */
function checkLoginStatus() {
    return getDocMetadata("isLoggedIn", false);
}

/**
 * Determine if the doc is archived/current
 * @returns {boolean} True if the doc is archived doc
 */
function isArchivedDoc() {
    return getDocMetadata("isArchivedDoc", false);
}

/**
 * Determine if the user is a MathWorks user.
 * @returns {boolean} True if the user is a MathWorks user
 */
function isMathWorksUser() {
    return getDocMetadata("isMathWorksUser", false);
}

function createDropdownButton(dropDownLabel, onlineLabel, installedLabel) {
    return createElementFromHTML(`
        <div class="dropdown d-grid add_margin_10">
            <button class="btn btn_color_blue dropdown-toggle" type="button" id="openExampleDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                ${dropDownLabel}
            </button>
            <ul class="dropdown-menu" aria-labelledby="openExampleDropdown">
                <li>
                    <a class="dropdown-item open-web-example" href="#">${onlineLabel}</a>
                </li>
                <li>
                    <a class="dropdown-item open-desktop-example" href="#">${installedLabel}</a>
                </li>
            </ul>
        </div>
    `);
}

function createSingleButton(label, btnId, callbackClass) {
    return createElementFromHTML(`
        <div class="d-grid add_margin_10">
            <button class="btn btn_color_blue ${callbackClass}" type="button" id="${btnId}" aria-expanded="false">
                ${label}
            </button>
        </div>
    `);
}

function createGetListItem(label, callbackClass) {
    return createElementFromHTML(`
        <li aria-hidden="true"><hr class="dropdown-divider"></li>
        <li class="add_padding_20 add_padding_top_12 add_padding_bottom_4">
            <a class="icon-copy add_font_color_darkgray ${callbackClass}" href="#">
                ${label}
            </a>
        </li>
    `);
}

function createElementFromHTML(htmlString) {
    const template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content;
}

// Swap to double-quotes per g2971507
function swapSingleToDoubleQuotes(str) {
    return str.replace(/'/g, '"');
}
