class GroupTypeaheadModel {
	constructor(options, attributes) {
	this.attributes = Object.assign({}, attributes);
	this.settings = Object.assign({}, options);
	this.collection = this.settings.collection;
	this.locale = this.settings.locale;
	this.timeout = null;
	this.pages = [];  
    this.words = [];  
    this.header = ''; 
	}
  }
  
  
  Object.assign(GroupTypeaheadModel.prototype, {
  getSuggestion: function (groupTypeAheadUrl, searchForm, isBasicTypeahead = false) {
		// Debounce logic here
		// Clear the existing timeout if any
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		this.searchForm = searchForm;
		// Set a new timeout for the fetch function to be called after a 250ms delay
		this.timeout = setTimeout(() => {
			fetch(groupTypeAheadUrl)
			.then(response => response.json())
			.then(result => {
				if (isBasicTypeahead) {
					this.updateSuggestion([], result.wordlist ? result.wordlist.map(word => word.fullword) : []);
				} else if (this.collection === 'documentation') {
					// For documentation, pass the entire pages array
					this.updateSuggestion(
						result.pages,
						result.words.wordlist.map(word => {
						return word.fullword;
						})
					);
				} else {
					// For other apps, pass first page suggestions
					this.updateSuggestion(
						result.pages[0].suggestions,
						result.words.wordlist.map(word => {
						return word.fullword;
						})
					);
				}
			})
			.catch(error => console.error('API Error:', error));
		}, 250);
  },

  
  updateSuggestion: function (contentData, suggestionData) {
	if (contentData.length !== 0 || suggestionData.length !== 0) {
  
	  if (this.collection === 'answers') {
		this.pages = this.map_answers_content(contentData);
		this.header = this.getLocale().questions;
		}
		if (this.collection === 'fileexchange') {
		this.pages = this.map_fx_content(contentData);
		this.header = this.getLocale().files;
		}
	
		if (this.collection === 'addons') {
		this.pages = this.map_addons_content(contentData);
		this.header = this.getLocale().addons;
		}
		if (this.collection === 'cody_problem') {
		this.pages = this.map_cody_content(contentData);
		this.header = this.getLocale().problems;
		}
		if (this.collection === 'blogs') {
		this.pages = this.map_blogs_content(contentData);
		this.header = this.getLocale().blogs;
		}
		if (this.collection === 'community_profiles') {
		this.pages = this.map_profiles_content(contentData);
		this.header = this.getLocale().profiles;
		}
		if (this.collection === 'documentation') {
		this.pages = this.map_documentation_content(contentData);
		this.header = '';
		}
  
	  this.words = suggestionData;
  
	  this.trigger('updated');
  
	} else {
  
	  this.trigger('removedSuggestion');
  
	}
  },
  
  map_answers_content: function(contentData){
	  var mapped_content =  contentData.map(obj => {
		   var rObj = {};
		   rObj['id'] = obj.id;
		   rObj['title'] = obj.title.join("");
		   rObj['body'] = obj.body.join("");
		   rObj['url'] = `/matlabcentral/${obj.path}`;
		   rObj['support'] = obj.support_answer;
		   rObj['accepted'] = obj.accepted;
		   rObj['answers_count'] = obj.answers_count;
		   return rObj;
	   });
	   return mapped_content;
  },
  
  map_fx_content: function(contentData){
	var mapped_content =  contentData.map(obj => {
		 var rObj = {};
		 rObj['title'] = obj.title.join("");
		 rObj['description'] = obj.description.join("");
		 rObj['url'] = `/${obj.path}`;
		 rObj['downloads'] = obj.total_downloads;
		 rObj['average_rating'] = obj.average_rating;
		 rObj['add_on_super_type'] = obj.add_on_super_type;
		 rObj['support'] = obj.source === 'mathworks'? true : false ;
		 return rObj;
	 });
	 return mapped_content;
  },
  
  map_addons_content: function(contentData){
	var mapped_content =  contentData.map(obj => {
		 var rObj = {};
		 rObj['title'] = obj.title.join("");
		 rObj['description'] = obj.description.join("");
		 rObj['url'] = obj.add_on_super_type === 'redirect_only' ? obj.url : `/add-ons/${obj.identifier}`;
		 rObj['downloads'] = obj.total_downloads;
		 rObj['average_rating'] = obj.average_rating;
		 rObj['add_on_super_type'] = obj.add_on_super_type;
		 rObj['add_on_type'] = obj.add_on_type;
		 rObj['support'] = obj.source === 'mathworks'? true : false ;
		 return rObj;
	 });
	 return mapped_content;
  },
  
  map_cody_content: function(contentData){
	var mapped_content =  contentData.map(obj => {
		 var rObj = {};
		 rObj['title'] = obj.title.join("");
		 rObj['url'] = `/${obj.path}`;
		 rObj['solvers'] = obj.solvers_count;
		 return rObj;
	 });
	 return mapped_content;
  },
  
  map_blogs_content: function(contentData){
	var mapped_content =  contentData.map(obj => {
		 var rObj = {};
		 rObj['title'] = obj.title.join("");
		 rObj['description'] = obj.description.join("");
		 rObj['url'] = obj.path;
		 return rObj;
	 });
	 return mapped_content;
  },
  
  map_profiles_content: function(contentData){
	var mapped_content = contentData.map(obj => {
		 var rObj = {};
		 rObj['id'] = obj.id;
		 rObj['nickname'] = obj.nickname;
		 rObj['avatar'] = obj.avatar || '';
		 rObj['url'] = `/matlabcentral/profile/authors/${obj.id}`;
		 rObj['contributions'] = obj.number_of_contributions || 0;
		 rObj['joined'] = obj.time_joined ? new Date(obj.time_joined) : null;
		 return rObj;
	 });
	 return mapped_content;
  },

  map_documentation_content: function(contentData){
	return contentData.map(group => {
		return {
		header: group.header,
		type: group.type,
		suggestions: group.suggestions.map(obj => {
			var rObj = {};
			rObj['title'] = obj.title ? obj.title.join("") : "";
			rObj['summary'] = obj.summary ? obj.summary.join("") : "";
			rObj['product'] = obj.product;
			rObj['url'] = `/help/${obj.path}`;
			rObj['type'] = obj.type;
			return rObj;
		})
		};
	});
  },

  
  getLocale () {
		const language = {
			en: {
				questions: 'Questions',
				suggestions: 'Search Suggestions',
				you_searched: 'Recent Searches',
				quick_links: 'Quick Links',
				footer_string: 'Can\'t find what you are looking for?',
				ask_string: 'Ask the Community',
				files: 'Files',
				addons: 'Add-Ons',
				download: 'Download',
				downloads: 'Downloads',
				problems: 'Problems',
				blogs: 'Blogs',
				profiles: 'Community Profiles'
			},
			ja: {
				questions: 'ご質問',
				suggestions: '提案',
				you_searched: '検索済み',
				quick_links: 'クイックリンク',
				footer_string: '探しているものが見つかりませんか？',
				ask_string: '尋ねる',
				files: 'ファイル',
				addons: 'アドオン',
				download: 'ダウンロード',
				downloads: 'ダウンロード',
				blogs: 'ブログ',
				profiles: 'Community Profiles'
			},
			ko: {
				questions: '질문',
				suggestions: '제안',
				you_searched: '검색 됨',
				quick_links: '빠른 링크',
				footer_string: '찾고있는 것을 찾을 수 없습니까?',
				ask_string: '물어보기',
				files: '개 파일',
				addons: '애드온',
				download: '다운로드 수',
				downloads: '다운로드 수',
				profiles: 'Community Profiles'
			},
			zh: {
				questions: 'Questions',
				suggestions: 'Search Suggestions',
				you_searched: 'Searched',
				quick_links: 'Quick Links',
				footer_string: 'Can\'t find what you are looking for?',
				ask_string: 'Ask the Community',
				files: '个文件',
				addons: '附加功能',
				download: '次下载',
				downloads: '次下载',
				profiles: 'Community Profiles'
			}
		};
		return language[this.locale];
	},
  
  trigger: function (event) {
	var callbacks = this.events[event];
	if (callbacks) {
	  callbacks.forEach(function(callback) {
		callback.call(this);
	  }.bind(this));
	}
  },
  
  on: function (event, callback) {
	if (!this.events) {
	  this.events = {};
	}
	if (!this.events[event]) {
	  this.events[event] = [];
	}
	this.events[event].push(callback);
  }
  
  });
  
  class UserareaTypeaheadElement extends HTMLElement {
	static get observedAttributes() {
		return ['input-selector', 'quick-links', 'collection', 'env', 'site-language', 'blank-state', 'add-profile', 'app-label'];
	}

	static get requiredAttributes() {
		return ['input-selector', 'collection', 'env', 'site-language', 'blank-state', 'app-label'];
	}

	static get BASIC_ONLY_COLLECTIONS() {
        return ['discussions', 'usercenter', 'online-courses-grouped']; 
    }

	static get CHECKBOX_DISABLED_COLLECTIONS() {
        return ['usercenter', 'community_profiles'];
    }


	  
  constructor() {
	super();
	this.inputSelector = null;
	this.quickLinks = [];
	this.collection = '';
	this.appLabel = '';
	this.env = '';
	this.siteLanguage = '';
	this.blankState = false;
	this.model = null;
	this.addProfile = false;
    this.pendingAttributes = new Set(UserareaTypeaheadElement.requiredAttributes);
	this.isBasicTypeahead = false;
	this.checkboxState = false;
	this.shouldShowCheckbox = false; 
	this.containerEl = null;
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
	switch (name) {
		case 'input-selector':
		this.inputSelector = newValue;
		break;
		case 'quick-links':
		this.quickLinks = JSON.parse(newValue);
		break;
		case 'collection':
		this.collection = newValue;
		break;
		case 'app-label': 
		this.appLabel = newValue;
		break;
		case 'env':
		this.env = newValue === 'prod' ? '' : `-${newValue}`;
		break;
		case 'site-language':
		this.siteLanguage = newValue.substring(0, 2);
		this.locale = ['en', 'ko', 'ja', 'zh'].includes(this.siteLanguage) ? this.siteLanguage : 'en';
		break;
		case 'blank-state':
		this.blankState = newValue === 'true';
		break;
		case 'add-profile':
        this.addProfile = newValue === 'true';
        break;
	}

    if (UserareaTypeaheadElement.requiredAttributes.includes(name)) {
      this.pendingAttributes.delete(name);
      
      // If all required attributes are set, initialize the typeahead
      if (this.pendingAttributes.size === 0) {
        this.initTypeahead();
      }
    }
	
  }

  initTypeahead() {
	this.el = document.querySelector(this.inputSelector);
	const isBasicOnlyCollection = UserareaTypeaheadElement.BASIC_ONLY_COLLECTIONS.includes(this.collection);
	this.isBasicTypeahead = (this.inputSelector === '#query' && this.collection !== 'documentation') || isBasicOnlyCollection;
	this.shouldShowCheckbox = this.inputSelector === '#query'
      && !UserareaTypeaheadElement.CHECKBOX_DISABLED_COLLECTIONS.includes(this.collection);
	if (this.el) {
		this.model = new GroupTypeaheadModel({ collection: this.collection, locale: this.locale });
		this.init();
	}
  }
  

  init () {
	var view = this;
		//setting the tracking
	this.setTrackingLabel();
	this.model.on('updated', () => {
	  this.pages = this.model.pages;
			this.words = this.model.words;
			this.header = this.model.header;
	  this.getSearchGroupTypeahead();
	});
	this.model.on('removedSuggestion', () => {
	  this.pages = [];
			this.words = [];
			this.header = '';
	  this.removeSuggestions();
	});

	window.addEventListener('resize', () => {
       this.applyMaxHeightToTypeahead();
    });

	this.el.addEventListener('focus', () => {
        view.clearSelection();
		if (view.blankState && view.el.value.trim().length === 0 && !view.containerEl) {
			view.getBlankStateTypeahead();
		}
	});
  
	this.el.addEventListener('keyup', (e) => {
			const key = e.keyCode ? e.keyCode : e.charCode;
			if (key === 27) {
				if (view.containerEl) {
					e.stopPropagation();
					view.removeSuggestions();
					view.el.value = '';
				}
			} else if (key !== 40 && key !== 38 && key !== 13 && key !== 32) {
				view.clearSelection();
				view.updateGroupTypeAhead();
			}
		});
  
	this.el.addEventListener('keydown', (e) => {
		const key = e.keyCode ? e.keyCode : e.charCode;
		if (key === 40) {
			e.preventDefault();
			if (!view.containerEl) {
				if (this.blankState) {
					this.getBlankStateTypeahead();
				}
			} else {
				view.handleArrowKey(key);
			}
		} else if (key === 38) {
			e.preventDefault();
			view.handleArrowKey(key);
		} else if (key === 27) {
			if (view.containerEl) {
				e.stopPropagation();
				view.removeSuggestions();
				view.el.value = '';
			}
		} else if (key === 13) {
			if (view.containerEl && view.containerEl.querySelectorAll('.selected-suggestion').length > 0) {
				e.preventDefault();
				view.handleEnterKey();
			}
		}
	});


		
	document.addEventListener('click', function(event) {
		var inputGroup = view.el.closest('.input-group');
		var isClickInsideInput = inputGroup && inputGroup.contains(event.target);
		var isClickInsideTypeahead = view.containerEl && view.containerEl.contains(event.target);
		var isRemoveButton = event.target.classList.contains('remove_suggestion');
		var inputHasFocus = document.activeElement === view.el;

		if (!(isClickInsideInput || isClickInsideTypeahead || isRemoveButton || inputHasFocus)) {
			view.removeSuggestions();
		}
	});



	// remove typeahead_container on clicking the close button in input
	this.el.addEventListener('click', function(e){
	  view.clearSelection();
	  setTimeout(function(){
	  if (view.el.value.length === 0){
		view.removeSuggestions();
		if (view.blankState) {
			 view.getBlankStateTypeahead();
		}
	  }
	  }, 100);
	});
  
	
	//add searchterm to local storage if blankstate is enabled
	this.el.closest('form').addEventListener('submit', function(e){
	  if (view.blankState) {
	  view.addSearchQueryToLocalStorage(view.sanitizeUserInput(view.el.value.trim()));
	  }
	});
  }


  
  setTrackingLabel () {
		switch (this.collection) {
			case 'answers':
				this.trackingLabel = 'ans';
				break;
			case 'fileexchange':
				this.trackingLabel = 'fx';
				break;
			case 'cody_problem':
				this.trackingLabel = 'cody';
				break;
			case 'blogs': 
				this.trackingLabel = 'blogs';
				break;
			case 'addons':
				this.trackingLabel = 'addons';
				break;
			case 'community_profiles':
				this.trackingLabel = 'profiles';
				break;
			case 'documentation':
                this.trackingLabel = 'help';
                break;
			case 'discussions':
				this.trackingLabel = 'discussions';
				break;
		    case 'usercenter':
				this.trackingLabel = 'usercenter';
				break;
			case 'online-courses-grouped':
				this.trackingLabel = 'online_courses';
				break;
			default:
				this.trackingLabel = '';
		}
   }

   setTracking(href) {
	  if (this.collection !== 'documentation') return;
	  if (!href || href.length === 0) return;

	  if (typeof window.SearchTracking === 'undefined') {
	    window.SearchTracking = {};
	  }

	  window.SearchTracking.app = 'support_results';
	  window.SearchTracking.typeahead = href;
	  window.SearchTracking.term = href;
	  window.SearchTracking.page = 'direct';

	  if (typeof _satellite !== 'undefined') {
	    _satellite.track('cruxTypeAhead');
	  }
   }

	addTrackingListeners() {
		if (!this.containerEl) return;
		this.containerEl.querySelectorAll('.suggestion_item:not(.word-suggestion)').forEach(link => {
		link.addEventListener('click', () => {
			this.setTracking(link.getAttribute('href'));
		});
		});
	}
  
   updateGroupTypeAhead() {
	var view = this;
	var model = this.model;
	var searchQuery = this.sanitizeUserInput(this.el.value.trim());
	var searchForm = this.el.closest('form');
  
	var groupTypeAheadUrl;

	if (this.isBasicTypeahead) {
		groupTypeAheadUrl = `https://services${view.env}.mathworks.com/typeahead/basic?resources=latestdoc&site_domain=www&site_language=${this.locale}&result_count=5&q=${searchQuery}&format=doc`;
	} else {
		groupTypeAheadUrl = `https://services${view.env}.mathworks.com/typeahead/grouped?resources=${view.getApiResource()}&q=${searchQuery}&site_language=${this.locale}`
		
		// Add result_count for profiles
		if (view.collection === 'community_profiles') {
			groupTypeAheadUrl += '&result_count=10&sort=popularity+desc';
		}
	
		if (view.collection === 'documentation') {
			groupTypeAheadUrl = `https://services${view.env}.mathworks.com/typeahead/grouped?resources=functions,blocks&site_domain=www&site_language=${this.locale}&result_count=5&q=${searchQuery}`;
		}
		
		// Add release parameter for addons
		groupTypeAheadUrl = (this.collection === "addons" ? `${groupTypeAheadUrl}&release=${this.el.getAttribute('data-release')}` : groupTypeAheadUrl);
	}
		if(searchQuery.length !== 0){
		 model.getSuggestion(groupTypeAheadUrl, searchForm, this.isBasicTypeahead);
		}
		else{
		 view.removeSuggestions();
		 if(view.blankState){view.getBlankStateTypeahead()};
		}
  }

  getApiResource() {
	const resourceMap = {
		'cody_problem': 'cody'
	};
	return resourceMap[this.collection] || this.collection;
  }
  
  removeSuggestions(){
	if (this.containerEl) {
	  this.containerEl.remove();
	  this.containerEl = null;
	}
  }  

  insertTypeaheadHtml(html) {
		this.removeSuggestions();
		const inputGroup = this.el.closest('.input-group');
		const template = document.createElement('template');
		template.innerHTML = html.trim();
		this.containerEl = template.content.firstChild;
		if (!this.containerEl) return;
		this.containerEl.addEventListener('mousedown', (e) => {
			if (e.target.tagName !== 'INPUT') {
				e.preventDefault();
			}
		});
		inputGroup.appendChild(this.containerEl);
 }

	//prevent XSS attacks
  sanitizeUserInput(input){
	return input.replace(/<(|\/|[^>\/bi]|\/[^>bi]|[^\/>][^>]+|\/[^>][^>]+)>/g, '');
  }

  escapeAttr(str) {
	if (str === null || str === undefined) return '';
	return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  calculateMaxHeight() {
	const inputRect = this.el.getBoundingClientRect();
	const viewportHeight = window.innerHeight;
	const spaceBelow = viewportHeight - inputRect.bottom;
	const spaceAbove = inputRect.top;
	const padding = 20; 
	
	const maxHeight = Math.max(spaceBelow, spaceAbove) - padding;
	const minHeight = 200;
	
	return Math.max(maxHeight, minHeight);
  }

  applyMaxHeightToTypeahead() {
    if (this.containerEl) {
        const maxHeight = this.calculateMaxHeight();
        this.containerEl.style.maxHeight = `${maxHeight}px`;
        this.containerEl.style.overflowY = 'auto';
    }
  }


  
  addSearchQueryToLocalStorage(searchQuery){
	var ls = window.localStorage;
	const maxItemLength = 10;
	if (typeof ls !== 'undefined' && searchQuery !== "") {
	  try {
	    var recentSearchHistory = JSON.parse(ls.getItem('recentSearchHistory') || '[]');
	  } catch (e) {
	    var recentSearchHistory = [];
	  }
	  var workingHistory = recentSearchHistory.length === maxItemLength? recentSearchHistory.slice(1):recentSearchHistory;
	  if(workingHistory.indexOf(searchQuery) === -1){
		var updatedHistory = workingHistory.concat(searchQuery);
		ls.setItem('recentSearchHistory', JSON.stringify(updatedHistory));
	  }
	}
  }
  
  addListenersToRemoveLinks(){
	if (!this.containerEl) return;
	this.containerEl.querySelectorAll('.remove_recent_search').forEach(item => {
	  item.addEventListener('click', event => {
		event.preventDefault();
		this.removeRecentSearchItem(event.target.parentElement.children[0].innerText);
	  })
	});
  }
  
  addListenersToWordSuggestions(){
	if (!this.containerEl) return;
	this.containerEl.querySelectorAll('.word-suggestion').forEach(link => {
		link.addEventListener('click', (event) => {
			const searchText = link.textContent.trim();
			this.addSearchQueryToLocalStorage(searchText);
		});
	});
  }  

  
  getBlankStateTypeahead(){
	var view = this;
	var quickLinks = view.quickLinks;
	const hasDisplayableQuickLinks = quickLinks.length !== 0 && !this.isBasicTypeahead;
	
	// Always show if blank state is enabled (even with empty searches)
	if (this.blankState || hasDisplayableQuickLinks) {
	  var groupTypeAheadHtml = view.renderBlankStateTemplate();
	  this.insertTypeaheadHtml(groupTypeAheadHtml);
	  this.applyMaxHeightToTypeahead();
	  if (this.shouldShowCheckbox) {
        this.addCheckboxListener();
      }
	  view.addListenersToRemoveLinks();
	}
  }


  
  removeRecentSearchItem(value){
	var ls = window.localStorage;
	if (typeof ls !== 'undefined') {
	  try {
	    var recentSearchHistory = JSON.parse(ls.getItem('recentSearchHistory') || '[]');
	  } catch (e) {
	    var recentSearchHistory = [];
	  }
	  var newHistory = recentSearchHistory.filter(item => item !== value)
	  ls.setItem('recentSearchHistory', JSON.stringify(newHistory));
	}
	this.removeSuggestions();
	this.getBlankStateTypeahead();
  }
  
  getSearchGroupTypeahead(){
		var view = this;
		if ( view.model.pages.length !== 0 || view.model.words.length !== 0 ) {
		var groupTypeAheadHtml = view.renderTemplate();
		this.insertTypeaheadHtml(groupTypeAheadHtml);
		this.applyMaxHeightToTypeahead();
		if (this.shouldShowCheckbox) {
		this.addCheckboxListener();
		}
		if (this.addProfile) {
			this.containerEl.querySelectorAll('.add-profile-link').forEach(link => {
				link.addEventListener('click', function(event) {
				const detail = {
					id: this.dataset.id,
					nickname: this.dataset.nickname,
					avatar: this.dataset.avatar
				};

				view.emitEvent('add-profile', detail);
				view.removeSuggestions();
				event.preventDefault();
				});
			});
		}
		if(this.collection === 'documentation') {this.addTrackingListeners();}
		if(view.blankState){view.addListenersToWordSuggestions();}
		}
  }


  emitEvent(eventName, detail = {}) {
	const event = new CustomEvent(eventName, {
		detail: detail,
		bubbles: true
	});
	this.dispatchEvent(event);
  }
  

  renderBlankStateTemplate(){
	let recentsearches;
	try {
	  recentsearches = JSON.parse(localStorage.getItem('recentSearchHistory') || '[]');
	} catch (e) {
	  recentsearches = [];
	}
	const locale = this.model.getLocale();

	const searchInAppHtml = this.shouldShowCheckbox ? `
    <div style="padding-bottom: 4px;">
		<input type="checkbox" id="scope_to_app_search" name="app" value="${this.collection}" data-app-name="${this.collection}" style="margin-right: 1px; margin-left: 10px">
		<span for="scope_to_app_search" style="bottom: 2px; position: relative; color: #616161">Search ${this.appLabel} only</span>
        <hr style="margin: .5rem 0;">
    </div>
	` : '';

	let recentSearchesHtml = "";
	if (this.blankState) {
	  recentSearchesHtml = `
		<div class="typeahead_group" role="group" aria-label="${locale.you_searched}">
		 <div class="typeahead_group_title">${locale.you_searched}</div>
		 <div class="typeahead_group_result">
		  ${recentsearches.length === 0 ? `
			<div class="suggestion add_font_color_mediumgray" style="padding: 10px;">
			  No recent searches
			</div>
		  ` : `
		  <ul class="suggestionarea dropdown-menu show">
			  ${recentsearches.reverse().slice(0, 5).map(recentsearch => `
				<li class="suggestion">
				  <a href="${this.searchResultsUrl(recentsearch, true)}" class="suggestion_item dropdown-item" data-enable-spinner=true>${this.escapeAttr(recentsearch)}</a>
				  <a href="javascript:void(0)" class="remove_suggestion remove_recent_search">Remove</a>
				</li>
			  `).join("")}
		  </ul>
		  `}
		  </div>
		</div>
	  `;
	}
  
	let linksHtml = "";
	if (this.quickLinks.length !== 0 && !this.isBasicTypeahead) {
	  linksHtml = `
		<div class="typeahead_group" role="group" aria-label="${locale.quick_links}">
		 <div class="typeahead_group_title">${locale.quick_links}</div>
		 <div class="typeahead_group_result">
			<ul class="suggestionarea dropdown-menu show">
			  ${this.quickLinks.map(link => `
				<li class="suggestion">
				  <a href="${link.link}" class="suggestion_item dropdown-item">${link.text}</a>
				</li>
			  `).join("")}
			</ul>
		  </div>
		</div>
	  `;
	}
  
	return `
	<div class="typeahead_container -presentation_grouped dropdown ${this.collection === 'answers'? 'add_padding_bottom_0':''}" id="search_suggestions" role="listbox" aria-label="Suggestions" tabindex="0" style="z-index: 1200;">
		${searchInAppHtml}
		${recentSearchesHtml}
		${linksHtml}
	</div>
	`;
  }


  
  formatContributionString(profile) {
    if (!profile.joined) {
      return `${profile.contributions} contributions`;
    }
    
    const joinedYear = profile.joined.getFullYear();
    return `${profile.contributions} contributions since ${joinedYear}`;
  }
  
  renderTemplate(){
    const searchInAppHtml = this.shouldShowCheckbox ? `
	<div style="padding-bottom: 4px;">
		<input type="checkbox" id="scope_to_app_search" name="app" value="${this.collection}" data-app-name="${this.collection}" style="margin-right: 1px; margin-left: 10px">
		<span for="scope_to_app_search" style="bottom: 2px; position: relative; color: #616161">Search ${this.appLabel} only</span>
        <hr style="margin: .5rem 0;">
    </div>
   ` : '';
   if (this.collection === 'documentation' && this.pages && this.pages.length > 0) {
    const nonEmptyGroups = this.model.pages.filter(group => group.suggestions && group.suggestions.length > 0);
    if (nonEmptyGroups.length === 0 && this.words.length === 0) {
      return '';
    }
    return `<div class="typeahead_container -presentation_grouped dropdown" id="search_suggestions" role="listbox" style="z-index: 1200;">
	  ${searchInAppHtml}
      ${nonEmptyGroups.map(group => `
        <div class="typeahead_group" role="group" aria-label="${group.header}">
          <div class="typeahead_group_title">${group.header} ${group.header === 'Blocks' ? '<span class="icon-block"></span>' : group.header === 'Functions' ? '<span class="icon-function"></span>' : ''}</div>
          <div class="typeahead_group_result">
            <ul class="suggestionarea dropdown-menu show">
              ${group.suggestions.map((suggestion, index) => `
                <li class="suggestion">
                  <a href="${suggestion.url}?s_tid=ta_${this.trackingLabel}_results" class="suggestion_item dropdown-item" id="${group.type}_${index}" role="option">
                    <span class="suggestion_summary refname">
                      ${this.titleWithHighlighting(suggestion.title, this.el.value)}
                      -
                      ${this.titleWithHighlighting(suggestion.summary, this.el.value)}
                    </span>
                    <span class="suggestion_product">${suggestion.product}</span>
                  </a>
                </li>
              `).join("")}
            </ul>
          </div>
        </div>
      `).join("")}
      ${this.words.length !== 0 ? `
        <div class="typeahead_group" role="group" aria-label="Suggestions">
          <div class="typeahead_group_title">${this.model.getLocale().suggestions}</div>
          <div class="typeahead_group_result">
            <ul class="suggestionarea dropdown-menu show">
              ${this.words.map(suggestion => `
                <li class="suggestion">
                  <a href="${this.searchResultsUrl(suggestion)}" class="suggestion_item dropdown-item word-suggestion">
                    ${this.titleWithHighlighting(suggestion, this.el.value)}
                  </a>
                </li>
              `).join("")}
            </ul>
          </div>
        </div>
      ` : ''}
    </div>`;
   }
   return `<div class="typeahead_container -presentation_grouped dropdown ${this.collection === 'answers'? 'add_padding_bottom_0':''}" id="search_suggestions" role="listbox" style="z-index: 1200;">
	 ${this.isBasicTypeahead ? searchInAppHtml : ``}  
     ${this.pages.length !== 0 ? `
	  <div class="typeahead_group" role="group" aria-label="${this.header}">
	   <div class="typeahead_group_title">${this.header}</div>
	     <div class="typeahead_group_result">
		  <ul class="suggestionarea dropdown-menu show">
			${this.pages.map(suggestion => `
			<li class="suggestion">
			<a href="${suggestion.url}?s_tid=ta_${this.trackingLabel}_results" class="suggestion_item dropdown-item" role="option">
				${this.collection === 'answers'? `
                    <div class="answers_meta ${suggestion.accepted === true ? '-is_accepted' : ''}">${suggestion.answers_count} <span class="sr-only visually-hidden">Answer</span></div>
                    <div class="suggestion_summary">
					 <span class="suggestion_title">
					  ${this.titleWithHighlighting(suggestion.title, this.el.value)}
					  ${(suggestion.support === true) ? '<span class="icon-membrane icon_16 support-answer"></span>' : ''}
					 </span>
					 <span class="suggestion_excerpt add_font_color_mediumgray">
					  ${this.titleWithHighlighting(suggestion.body, this.el.value)}
					 </span>
				    </div>
				`: this.collection === 'community_profiles'? `
                    <div class="answers_meta" style="border: none">
                     <img src="/responsive_image/75/75/0/0/0/cache/matlabcentral/profiles/${this.escapeAttr(suggestion.avatar)}"  alt="${this.escapeAttr(suggestion.nickname)}" onerror="this.src='/responsive_image/75/75/0/0/0/cache/matlabcentral/profiles/profilepic_default.gif';"  class="profile-avatar" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;">
                    </div>
                    <div class="suggestion_summary">
                      <span class="suggestion_title">
                        ${this.titleWithHighlighting(suggestion.nickname, this.el.value)}
                      </span>
                      <span class="suggestion_excerpt add_font_color_mediumgray">
                        ${this.formatContributionString(suggestion)}
                      </span>
                    </div>
                `:
				`<span class="suggestion_summary">
					${this.titleWithHighlighting(suggestion.title, this.el.value)}
					${(['fileexchange','addons'].includes(this.collection) && suggestion.support === true)? '<span class="icon-membrane icon_16 support-answer"></span>' : ''}
				</span>
	
				${['fileexchange','addons'].includes(this.collection) ? `
				<span class="suggestion_summary add_font_color_mediumgray hidden-xs">${this.titleWithHighlighting(suggestion.description, this.el.value)}</span>
				<span class="suggestion_meta">
				${!['product','redirect_only'].includes(suggestion.add_on_super_type) ? `
				<ul class="list-inline -has_list_separators">
					<li class="list-inline-item">
					 <span class="icon-download" aria-label="Downloads"></span> ${this.abbreviateNumber(suggestion.downloads)}
					</li>
					<li class="list-inline-item">
					 <span class="icon-rating" aria-label="Average Rating"></span> ${suggestion.average_rating !== null ? suggestion.average_rating : "0" }/5
					</li>
				</ul>` : `Product`
				}
				</span>
				` : ''}`
			}	
			</a>
			${this.addProfile ? 
						`<a href="javascript:void(0)" class="remove_suggestion add_font_color_darkblue add-profile-link"
							data-id="${this.escapeAttr(suggestion.id)}"
							data-nickname="${this.escapeAttr(suggestion.nickname)}"
							data-avatar="${this.escapeAttr(suggestion.avatar || '')}" >
							<span class="icon-add-circle icon_24"></span>
						</a>` : ''}
			</li>
			`).join("")}
	     </ul>
	    </div>
	  </div>
	  ` : ''}
	  ${this.words.length !== 0 && (this.collection !== 'community_profiles' || this.isBasicTypeahead) ?
	  `<div class="typeahead_group" role="group" aria-label="${this.header}">
		 <div class="typeahead_group_title">${this.model.getLocale().suggestions}</div>
		   <div class="typeahead_group_result">
			<ul class="suggestionarea dropdown-menu show">
				${this.words.map(suggestion => `
					<li class="suggestion">
					<a href="${this.searchResultsUrl(suggestion)}" class=" suggestion_item dropdown-item word-suggestion">
					${this.titleWithHighlighting(suggestion, this.el.value)}
					</a>
					</li>
				`).join("")}
			</ul>
		   </div>
	   </div>
	  ` : ''}
	${this.collection === 'answers' && !this.isBasicTypeahead ? `
	<div class="clearfix"></div>
	<div class="suggestion_footer">
     <div class="col"><strong>${this.model.getLocale().footer_string}</strong></div>
     <div class="col"><a href="/matlabcentral/answers/questions/new?s_tid=ta_ans_ask" class="btn btn_color_blue btn-sm">${this.model.getLocale().ask_string}</a></div>
    </div>
	` : ''} 
	</div>`
  }
  
  titleWithHighlighting(title, highlighted) {
	title = this.sanitizeUserInput(title) || "";
	var i = title.toLowerCase().indexOf(highlighted.toLowerCase());
  
	if (i < 0) {
	return title;
	}
  
	var start = title.substring(0, i),
	middle = title.substring(i, i + highlighted.length),
	end = title.substring(i + highlighted.length);
  
	return start + "<strong>" + middle + "</strong>" + end;
  }
  
  abbreviateNumber(num, fixed) {
	if (num === null) { return null; } // terminate early
	if (num === 0) { return '0'; } // terminate early
	fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
	var b = (num).toPrecision(2).split("e"), // get power
	  k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
	  c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3) ).toFixed(1 + fixed), // divide by power
	  d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
	  e = d + ['', 'k', 'M', 'B', 'T'][k]; // append power
	return e;
  }
  
  searchResultsUrl(suggestion, recentSearchUrl = false) {
    var encodedSuggestion = encodeURIComponent(suggestion);
    var suggestion_href;
    var baseUrl = window.location.hostname.startsWith('www') ? '' : `https://www${this.env}.mathworks.com`;

    if (this.isBasicTypeahead || this.collection === 'documentation') {
        if (this.checkboxState) {
            suggestion_href = `${baseUrl}/search/user-center?q=${encodedSuggestion}&app=${this.collection}`;
        } else {
            suggestion_href = `${baseUrl}/search/user-center?q=${encodedSuggestion}`;
        }
    }
	else if(this.collection === "cody_problem"){
	    suggestion_href = `${baseUrl}/matlabcentral/cody/problems/?term=${encodedSuggestion}`;
	}
    else if(this.collection === "blogs"){
        suggestion_href = `${baseUrl}/search.html?c[]=${this.collection}&q=${encodedSuggestion}`;
    }
    else if(this.collection === "addons"){
        suggestion_href = `${baseUrl}/add-ons/?q=${encodedSuggestion}`;
    }
    else if(this.collection === "community_profiles"){
        suggestion_href = `${baseUrl}/matlabcentral/profile/authors/search?c[]=community_profile&name=${encodedSuggestion}`;
    }
    else{
        suggestion_href = `${baseUrl}/matlabcentral/${this.collection}/?term=${encodedSuggestion}`;
    }
    suggestion_href = recentSearchUrl ? suggestion_href + '&s_tid=ta_'+this.trackingLabel+'_prevsearch' : suggestion_href + '&s_tid=ta_'+this.trackingLabel+'_phrases';
    return suggestion_href;
  }


  addCheckboxListener() {
	const checkbox = this.containerEl.querySelector('#scope_to_app_search');
	if (checkbox) {
		checkbox.checked = this.checkboxState;
		checkbox.addEventListener('change', () => {
		// Update recent search links (blank state)
		this.checkboxState = checkbox.checked;
		this.containerEl.querySelectorAll('.remove_recent_search').forEach(removeLink => {
			const suggestionLink = removeLink.previousElementSibling;
			if (suggestionLink && suggestionLink.classList.contains('suggestion_item')) {
			const searchText = suggestionLink.textContent.trim();
			suggestionLink.href = this.searchResultsUrl(searchText, true);
			}
		});
		
		// Update normal suggestion links (word suggestions)
		this.containerEl.querySelectorAll('.typeahead_group').forEach(group => {
			const groupTitle = group.querySelector('.typeahead_group_title')?.textContent;
			if (groupTitle === this.model.getLocale().suggestions) {
			group.querySelectorAll('.suggestion_item').forEach(link => {
				const searchText = link.textContent.trim();
				link.href = this.searchResultsUrl(searchText, false);
			});
			}
		});
		this.el.focus();
		});
	}
	}

  
  handleArrowKey (key){
	if (!this.containerEl) return;

	const allSuggestions = Array.from(this.containerEl.querySelectorAll('.suggestion'));
	if (allSuggestions.length === 0) return;

	const selected = this.containerEl.querySelector('.selected-suggestion');
	const currentIndex = selected ? allSuggestions.indexOf(selected) : -1;
	let nextIndex;

	if (key === 40) { // Down arrow
		nextIndex = (currentIndex + 1) % allSuggestions.length;
	} else if (key === 38) { // Up arrow
		nextIndex = currentIndex <= 0 ? allSuggestions.length - 1 : currentIndex - 1;
	} else {
		return;
	}

	if (selected) {
		selected.classList.remove('selected-suggestion');
	}

	const newSelection = allSuggestions[nextIndex];
	if (newSelection) {
		newSelection.classList.add('selected-suggestion');

		// Find the direct scrollable parent list for the selected item.
		// This is the key to fixing the grouped layout.
		const scrollableParent = newSelection.closest('.suggestionarea');

		// This logic is now robust for both layouts.
		if (scrollableParent) {
			// Use offsetTop, which is relative to the scrollable parent.
			const itemTop = newSelection.offsetTop;
			const itemBottom = itemTop + newSelection.offsetHeight;

			const parentScrollTop = scrollableParent.scrollTop;
			const parentVisibleHeight = scrollableParent.clientHeight;
			const parentVisibleBottom = parentScrollTop + parentVisibleHeight;

			if (itemBottom > parentVisibleBottom) {
				// If item is below view, scroll down to show it.
				scrollableParent.scrollTop = itemBottom - parentVisibleHeight;
			} else if (itemTop < parentScrollTop) {
				// If item is above view, scroll up to show it.
				scrollableParent.scrollTop = itemTop;
			}
		}
	}
  }

  handleEnterKey() {
	var selected = this.containerEl.querySelector('.selected-suggestion');
	var link = selected.querySelector('a');
	var href = link.getAttribute('href');

	if (this.blankState && link.classList.contains('word-suggestion')) {
		const searchText = link.textContent.trim();
		this.addSearchQueryToLocalStorage(searchText);
	}

	if (!link.classList.contains('word-suggestion')) {
		this.setTracking(href);
	}
	
	this.removeSuggestions();
	if (this.collection === 'addons') {
	  document.querySelector('#search_spinner').classList.add('show_progress_indicator');
	}
	if (href) {
	  location.href = href;
	}
  }
  
  clearSelection() {
	if (!this.containerEl) return;
	var selected = this.containerEl.querySelector('.selected-suggestion');
	if (selected) {
	  selected.classList.remove('selected-suggestion');
	}
  }
  }
  
  // Register the custom element
  customElements.define('userarea-typeahead', UserareaTypeaheadElement);

