
(function(){
	var ui = {

		globals : {
			hasDebug : false,
			depth: 0
		},
		actions : {},
		pageActions: {},
		pages : [],
		partials: [],
		inputs : [],
		watched : [],
		attrs : [],
		templates : [],


		getPages : function() {
			ui.pages = document.querySelectorAll('[data-role="page"]');
			ui.globals.pageContainer = document.querySelectorAll('[data-role="page-container"]');
			// register hashchange event for routing
			window.onhashchange = readHistory;
		},
		replIncludes : function()  {
			ui.partials = document.querySelectorAll('[data-role="partial"]');
			var includes = document.querySelectorAll('[data-include]');
			for(var i = 0; i < includes.length; i++) {
				var inc = includes[i];
				for(var j = 0; j < ui.partials.length; j++) {
					if(ui.partials[j].id == inc.getAttribute('data-include')) {
						// replace the node with a copy of the partial
						var part = ui.partials[j].cloneNode(true);
						part.removeAttribute('data-role');
						part.id = inc.id || 'inc-' + i;
						inc.parentNode.replaceChild(part, inc);
					}
				}
			}

		},
		hidePages : function(exception) {
			for (var i = 0; i < ui.pages.length; i++) {
				if(ui.pages[i].id != exception) {
					removeClass(ui.pages[i], 'show');
					removeClass(ui.pages[i], 'lower');
				}
			}
		},
		showPage : function(pageid, noHistory) {
			pageid = pageid.replace('#','');
			var pageEle = document.getElementById(pageid)
			console.log('show page ' + pageid)
			window.scrollTo(0,0);
			var pageaction = pageEle.getAttribute('data-onshow') || false;
			if(pageaction && ui.pageActions && Object.keys(ui.pageActions).indexOf(pageaction) != -1) {
				ui.pageActions[pageaction].call(this);
			}
			// try to add title
			if(pageEle.querySelector('h1')) {
				document.title = pageEle.querySelector('h1').innerText;
			}
			ui.refresh();
			addClass(pageEle, 'show');
			setTimeout(function(){
				ui.hidePages(pageid);
				addClass(pageEle, 'lower');
				if(ui.globals.pageContainer ) {
					//ui.globals.pageContainer[0].style.height = pageEle.scrollHeight + 'px';
				}
			},250);
			if(! noHistory) pushHistory(pageid);  
		},
		getFields : function() {
			var elements = document.querySelectorAll('[data-input]');
			if(elements && elements.length) {
				console.log('get fields (' + elements.length + ')')
				for(var i = 0; i < elements.length; i++) {
					var ele = elements[i];
					if(ele.hasAttribute('data-input')) {
						ele.ui_model = ele.getAttribute('data-input');
						addClass(ele, 'ui-input');
						ele.removeAttribute('data-input');
						ui.inputs.push(ele);
						if(ui.watched[ele.ui_model] == undefined) {
							ui.watched[ele.ui_model] = {
								ele: [ele],
								value: getModel(ele.ui_model)
							}
						} else {
							ui.watched[ele.ui_model].ele.push(ele)
							ui.watched[ele.ui_model].value = getModel(ele.ui_model);
						}
						if(ele.addEventListener) {
							ele.addEventListener('blur', function(){
								app.model[ele.ui_model] = this.value;
								ui.refresh();
							}, true);
						} else if (ele.attachEvent) {
							ele.attachEvent('blur', function(){
								app.model[ele.ui_model] = this.value;
								ui.refresh();
							});
						} else {
							console.log('UI error. Cannot attach event to field');
						}
					}
				}
			}
		},
		getAttributes : function() {
			var elements = document.querySelectorAll('[data-attr]');
			if(elements && elements.length) {
				console.log('get attributes (' + elements.length + ')')
				for(var i = 0; i < elements.length; i++) {
					var ele = elements[i];
					var dataAttr = ele.getAttribute('data-attr').split(',');
					var attr = dataAttr[0].trim();
					var key = dataAttr[1].trim();
					addClass(ele, 'ui-bindAttr');
					ele.removeAttribute('data-attr');
					
					if(ui.watched[key] == undefined) {
						ui.watched[key] = {
							attr: [{'ele': ele, 'attr' : attr}],
							value: getModel(key)
						}
					} else {
						ui.watched[key].attr.push({'ele': ele, 'attr' : attr});
						ui.watched[key].value = getModel(key);
					}
					ui.setAttr(ele,attr,key);
				}
			}
		},
		getRepeaters : function() {
			var elements = document.querySelectorAll('[data-repeat]');
			if(elements && elements.length) { 
				console.log('get repeaters (' + elements.length + ')')
				for(var i = 0; i < elements.length; i++) {
					var ele = elements[i];	
					ele.ui_repeat = true;
					ele.ui_model = ele.getAttribute('data-repeat');	
					if(getModel(ele.ui_model) != undefined) {
						ele.removeAttribute('data-repeat');
						addClass(ele, 'ui-repeat');
						if(ui.watched[ele.ui_model] == undefined) {
							ui.watched[ele.ui_model] = {
								ele: [ele],
								value: getModel(ele.ui_model)
							}

						} else {
							ui.watched[ele.ui_model].ele.push(ele);
							ui.watched[ele.ui_model].value = getModel(ele.ui_model);
						}
					} else {
						console.log('cannot define repeater ' + ele.ui_model);
						//return false;
					}
				}
				for(var i = 0; i < elements.length; i++) {
					ui.setRepeater(elements[i]);
				}
			}
		},
		getConditionals : function() {
			var elements = document.querySelectorAll('[data-if],[data-not]');
			if(elements && elements.length) {
				console.log('get conditionals (' + elements.length + ')')
				for(var i = 0; i < elements.length; i++) {
					var ele = elements[i];
					console.log(ele);

					if(ele.hasAttribute('data-if')) {
						ele.ui_model = ele.getAttribute('data-if');
						ele.removeAttribute('data-if');
						addClass(ele, 'ui-if');
						ele.ui_conditional = 'if';
						watch = true;
					} else {
						ele.ui_model = ele.getAttribute('data-not');
						ele.removeAttribute('data-not');
						addClass(ele, 'ui-not');
						ele.ui_conditional = 'not';
						watch = true;
					}

					if(ui.watched[ele.ui_model] == undefined) {
						ui.watched[ele.ui_model] = {
							ele: [ele],
							value: getModel(ele.ui_model)
						}
					} else {
						ui.watched[ele.ui_model].ele.push(ele);
						ui.watched[ele.ui_model].value = getModel(ele.ui_model);
					}

					//ui.setConditional(ele);							
				}
			}
		},
		getVars : function() {
			var elements = document.querySelectorAll('[data-model]');
			var keys = Object.keys(app.model);
			if(elements && elements.length) {
				console.log('get vars (' + elements.length + ')')
				for(var i = 0; i < elements.length; i++) {
					var ele = elements[i];
					var attr = ele.getAttribute('data-model');
					var model = getModel(attr);
					console.log('var ' + attr)
					ele.ui_model = attr;
					addClass(ele, 'ui-bind');
					ele.removeAttribute('data-model');
					//ui.setVar(ele)
					if(ui.watched[ele.ui_model] == undefined) {
						ui.watched[ele.ui_model] = {
							ele: [ele],
							//value: cloneObj(app.model[ele.ui_model])
							value: model
						}
					} else {
						ui.watched[ele.ui_model].ele.push(ele);
						//ui.watched[ele.ui_model].value = cloneObj(app.model[ele.ui_model]);
						ui.watched[ele.ui_model].value = model;
					}
				}
			}
		},
		getDebug : function() {
			var elements = document.querySelectorAll('[data-role="debug"]');
			if(elements && elements.length) {
				ui.globals.hasDebug = true;
				ui.globals.debugElements = elements;
			}
		},
		resetActions : function(ele) {
			// resets an element to be able to reassign the event listeners
			// this is needed on repeated elements as the event will not clone
			var action = ele.getAttribute('data-action');
			if(action) {
				ele.setAttribute('data-click', action);
				removeClass(ele,'clickable');				
			}
		},
		setActions : function(){
			// scan dom to find unbound action elements
			var elements = document.querySelectorAll('[data-click]');
			var keys = Object.keys(ui.actions);

			for (var i = 0; i < elements.length; i++) {
				var ele = elements[i];
				action = ele.getAttribute('data-click');
				if(keys.indexOf(action) != -1) {
					ele.onclick = function(event) {
						// pass the caller to action function
						console.log('click')
						event.stopPropagation();
						ui.actions[this.getAttribute('data-action')](event.target);
					}
					addClass(ele,'clickable');
					ele.setAttribute('data-action', action);
					ele.removeAttribute('data-click');
				}

			}
		},
		setVar : function(ele, model) {
			if(ele) {
				var val = getModel(model);
				console.log('setVar ' + model + ' : ' + val);
				if(Array.isArray(val)) {
					val = val.join(', ');
				}
				if(isInput(ele)) {
					// formfield
					ele.value = val;
				} else {
					// plain element
					ele.innerHTML = val;
				}	
				console.log(ele)				
			}
		},
		setAttr : function(ele, attr, model) {
			// if value is null, remove the attribute
			// this is used for attributes like disabled or selected
			if(ele) {
				console.log('setAttr ' + attr + ' as ' + model)
				var val = getModel(model);
				if(Array.isArray(val)) {
					val = val.join(', ');
				}
				if(attr == 'class') {
					var prevVal = ui.watched[model].value;
					removeClass(ele,prevVal);
					addClass(ele,val);
				} else {
					ele.setAttribute(attr,val) ;
				}
				if(val == null) {
					if(attr == 'class') {
						removeClass(ele,attr);
					} else {
						ele.removeAttribute(attr);	
					}
					
				} 
								
			}
		},

		setConditional : function(ele) {
			// this is used only for conditional elements
			// adds a "show" or "hide" class to the ele based on the show argument (bool)
			if(ele) {
				var show = getModel(ele.ui_model);
				console.log('setConditional ' + ele.ui_model)
				if(ele.ui_conditional == 'not') {
					show = !show;
				}
				console.log(show)
				if(show) {
					removeClass(ele, 'hide');
					addClass(ele, 'show');
				} else {
					removeClass(ele, 'show');
					addClass(ele, 'hide');
				}		
			}		
		},
		setRepeater : function(ele) {

			if(ele.ui_model) {
				console.log('setRepeater ' + ele.ui_model);
				var model = getModel(ele.ui_model);
				
				if(ui.watched[ele.ui_model] != undefined) {
					
					for(var j = 0; j < ui.watched[ele.ui_model].ele.length; j++) {
						if(Array.isArray(model)) {
							var template = ui.watched[ele.ui_model].ele[j];
							// reset actions
							ui.resetActions(ele);
							var clickableEle = template.querySelectorAll('[data-action]');
							for (var i = 0; i < clickableEle.length; i++) {
								ui.resetActions(clickableEle[i]);	
							}								
							var newEle;
							var children = template.parentNode.querySelectorAll('[data-template="'+ template.ui_model +'"]'); // remove existing repeaters so we can add them again
							for(var i = 0; i < children.length; i++) {
								children[i].parentNode.removeChild(children[i]);
							}

							for(var k = 0; k < model.length; k++) {
								var item = {};
								if(typeof model[k] == 'object') {
									item = cloneObj(model[k]);
								} else {
									// simple array with just values
									item.value = model[k];
								}
								item.index = k;
								ui.globals.depth = 0; // reset depth
								newEle = replaceHandlebars(template.cloneNode(true), item);
								removeClass(newEle, 'hide');
								newEle.setAttribute('data-template', ele.ui_model)
								newEle.ui_index = item.index;
								template.parentNode.appendChild(newEle);
							} 
							// check for new bindings
							ui.initBindings();

						} else {
							console.log('cannot set repeater');
						}

						// hide original node
						addClass(template, 'hide');	

					}
				}
			}					
		},
		hasChanged : function(model) {
			// test if the model value has changed
			return ! (areEqual(getModel(model),ui.watched[model].value));
		},
		refresh : function() {
			console.log('*** refresh');

			// loop through all watched 
			keys = Object.keys(ui.watched);
			for(var i = 0; i < keys.length; i++) {
				var model = keys[i];
				if(ui.hasChanged(model)) {
					console.log(model + ' changed')
					// rerender all elements bound to this model
					var eles = ui.watched[model].ele;
					if(eles) {
						for(var k = 0; k < eles.length; k++) {
							if(eles[k].ui_conditional != undefined) {
								ui.setConditional(eles[k]);
							} else if (eles[k].ui_repeat != undefined) {
								ui.setRepeater(eles[k]);
							} else {
								ui.setVar(eles[k], model);
							}
						}
					}
					// render all attributes bound to this model
					var attrs = ui.watched[model].attr;
					if(attrs) {
						for(var k = 0; k < attrs.length; k++) {
							ui.setAttr(attrs[k]['ele'], attrs[k]['attr'], model);
						}							
					}
				
					// sync watched object value
					ui.watched[model].value = cloneObj(getModel(model));
				}					
			}
			if(ui.globals.hasDebug) {
				// show all model properties in debug objects
				for(var i = 0; i < ui.globals.debugElements.length; i++) {
					ui.globals.debugElements[i].innerHTML = JSON.stringify(app.model,  null, 4);
				}
			}

		},
		initBindings : function() {
			// find all pages & save to ui.pages array
			ui.getPages();

			// find all form fields with a bound model
			ui.getFields();			

			// find all bindable elements
			ui.getVars();

			// find all bindable element attributes
			ui.getAttributes();			

			// replace repaters
			ui.getRepeaters();

			// show/hide conditionals
			ui.getConditionals();

			// replace includes
			ui.replIncludes();

			// find all clickable elements
			ui.setActions();


		},

		init : function(defaultpage){
			console.log('UI init()');

			// find debug elements
			ui.getDebug();			

			ui.initBindings();

			//show first page 
			if(defaultpage) {
				ui.showPage(defaultpage);
			} else {
				alert("UI ModelView Error: no default page specified in init()")
			}

		}
	};

	// make public
	window.ui = ui;




	var service = {
		sendRequest : function(endpoint, method, data, headers) {
	      return new Promise(function (resolve, reject) {
	        var req = new XMLHttpRequest();
	        req.open(method,endpoint, true);
	        req.setRequestHeader('Content-Type', 'application/json');
	        req.setRequestHeader('Accept', 'application/json');
	        if(headers) {
	          for(var key in headers) {
	            if(headers.hasOwnProperty(key)) {
	              req.setRequestHeader(key, headers[key]);
	            }
	          }
	        }
	        req.onload = function() {
	          if (this.status >= 200 && this.status < 300) {
	            try {
	              resolve(JSON.parse(req.response));
	            } catch(e) {
	              reject({
	                status: 0,
	                statusText: 'Could not parse response'
	              })
	            }
	          } else {
	            reject({
	              status: this.status,
	              statusText: req.statusText
	            });
	          }
	        };
	        req.onerror = function () {
	          reject({
	            status: this.status,
	            statusText: req.statusText
	          });
	        };
	        req.send(JSON.stringify(data));
	      });
	    },

	    createPromise : function(endpoint, method, data, headers, cacheTTL) {
		    var defaultCacheTTL = 300000;
		    cacheTTL = (cacheTTL == undefined) ? defaultCacheTTL : cacheTTL;
		    return new Promise(function (resolve, reject) {
		    	if(cacheTTL != 0) {
		    		// read from local storage
			        var cache = service.readFromCache(service.hashCode(JSON.stringify(data)), cacheTTL);
			        if(cache) {
			          resolve(cache);
			        } 		    		
		    	}
		    	// send async request, store response to local storage and resolve promise
		        service.sendRequest(endpoint, method, data).then(function(response){
		            service.storeToCache(service.hashCode(JSON.stringify(data)), response);
		            resolve(response);
		        }).catch(function(err) {
		            reject(err);
		        });          
		    });
	    },

	    post : function(endpoint, data, headers, cacheTTL) {
			var method = 'POST';
			return createPromise(endpoint, method, data, headers, cacheTTL);
	    },

	    get : function(endpoint, data, headers, cacheTTL) {
			var method = 'GET';
			return createPromise(endpoint, method, data, headers, cacheTTL);
	    },	    

        hashCode : function(str) {
	        return str.split('').reduce((prevHash, currVal) =>
	        ((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0);
	    },

	    storeToCache : function(hash,  data) {
	      // add to sessionStorage
	      try {
	        sessionStorage[hash] = JSON.stringify({"_date":Date.now() , "data" : data});
	      } catch(e) {
	        return false;
	      }
	      return true;
	    },

	    readFromCache : function(hash, ttl) {
	      var sdata = sessionStorage[hash];
	      if(sdata) {
	        sdata = JSON.parse(sdata);
	        if(sdata['_date'] + ttl > Date.now()) {
	          console.log('read from cache, age: ' + (Date.now() - sdata['_date'] ))
	          return sdata.data;
	        }
	      }
	      return false;
	    }


	};

	/* serivce usage: 

		service.post(endpoint, data, headers, cacheTTL).then(function(response){
			console.log(response);
		}).catch(function(e){
			console.log('Error: ' + e);
		}); 

		endpoint: The url of the web service
		data: JSON Object containing the post/get parameters
		headers: JSON object containing custom headers
		cacheTTL: Amount of time to reuse the last request (in milliseconds). Set to 0 to for a fresh request

	*/

	var removeClass = function(obj,className) {
		if(obj) {
			var objClass = obj.getAttribute && obj.getAttribute( "class" ) || "";
			objClass = " " + objClass + " ";
			var finalClass = objClass.replace(" " + className + " ", "").replace(/[ ]+/g,' ').replace(/^ | $/g,'');
			obj.className = finalClass;	
			if(finalClass == '') obj.removeAttribute('class');
		}
	};
	window.removeClass = removeClass;

	var addClass = function(obj,className) {
		if(obj) {
			var objClass = obj.getAttribute && obj.getAttribute( "class" ) || "";
			objClass = " " + objClass + " ";
			if(objClass.indexOf(" " + className + " " ) < 0) {
				var finalClass = objClass + " " + className;
				finalClass = finalClass.replace(/[ ]+/g,' ').replace(/^ | $/g,'');
				obj.setAttribute('class', finalClass);
			}		
		}
	};
	window.addClass = addClass;
/*
	var replaceHandlebars = function(ele, item, protect) {
		var tokens = findToken(ele.innerHTML);
		var re;
		if(tokens) {
			for(var i = 0; i<tokens.length; i++) {
				if(item[tokens[i]] != undefined) {
					re = new RegExp('{{'+ tokens[i] +'}}','g');
					if(protect) {
						ele.innerHTML = ele.innerHTML.replace(re, '{{p.'+ tokens[i] +'}}');
					} else {
						ele.innerHTML = ele.innerHTML.replace(re, item[tokens[i]]);
					}
					
				}
			}
		}
		return ele;
	};

	var replaceTokens = function(ele, tokens) {
		var re;
		if(tokens) {
			for(var i = 0; i<tokens.length; i++) {
				if(item[tokens[i]] != undefined) {
					re = new RegExp('{{'+ tokens[i] +'}}','g');
					ele.innerHTML = ele.innerHTML.replace(re, item[tokens[i]]);

				}
			}
		}
		return ele;
	};

	var findToken = function(str) {
		var re = /{{[^}]+}}/g;
		var tokens = str.match(re);
		if(tokens && tokens.length > 0){
			return tokens.map(function(val){
				return val.replace('{{','').replace('}}','');
			});
		}
		return undefined;
	};


*/
	var replaceHandlebars = function(ele, item) {
		var re = /{{([^}]+)}}/g;
		if(ele && item != undefined) {
			var attrNames = ele.getAttributeNames();
			for(var j = 0; j < attrNames.length; j++) {
				// replace any tokens in attributes
				
				ele.setAttribute(attrNames[j], ele.getAttribute(attrNames[j]).replace(re, function(str,p1){
					console.log('attr ' + ele.getAttribute(attrNames[j]) + ' ' + item[p1])
					return (item[p1] != undefined) ? item[p1] : '';
				}))
			}	
			
			if(ui.globals.depth == 0 || (ele.getAttribute('data-repeat') == null && ele.className.indexOf('ui-repeat') == -1)) {
				console.log('replaceHandlebars ' + ui.globals.depth + ' '  +  ele.tagName)
				console.log('rpt ' + ele.getAttribute('data-repeat') )
				ui.globals.depth ++;
				// ignore the root element but stop when encountering child repeater
				if(ele.children.length) {
					// recursive function to go through each child element
					for(var i = 0; i < ele.children.length; i++) {
						console.log('child ' + ele.children[i].tagName)
						replaceHandlebars(ele.children[i], item);
					}
				} else {
					// replace tokens in innerHTML
					var str = ele.innerHTML.replace(re,function(str,p1){
						console.log(str)
						return (item[p1] != undefined) ? item[p1] : '';
					});
					ele.innerHTML = str;					
				}


			}

		}
		return ele;
	};


	var pushHistory = function(hash) {
		if(history.pushState) {
		    history.pushState(null, null, '#' + hash);
		    console.log('pushState ' + '#' + hash )
		} else {
		    location.hash = '#' + hash;
		}
	};

	var readHistory = function() {
		var hash = window.location.hash.replace('#','');
		if(hash) {
			ui.showPage(hash, true);
			return true;
		}
		return false;
	};

	var cloneObj = function(obj){
		// deep copy of an object
		// return JSON.parse(JSON.stringify(obj))
	    if(obj == null || typeof(obj) != 'object')
	        return obj;
	    var temp = new obj.constructor(); 
	    for(var key in obj)
	        temp[key] = cloneObj(obj[key]);
	    return temp;
	};

	var isInput = function(ele) {
		var types = ['input','number','date'];
		if(types.indexOf(ele.type) != -1) {
			return true;
		}
		return false;
	};

	var areEqual = function(obj1, obj2) {
	    var a = JSON.stringify(obj1), b = JSON.stringify(obj2);
	    if (!a) a = '';
	    if (!b) b = '';
	    return (a.split('').sort().join('') == b.split('').sort().join(''));
	};

	var hasOwnProp = Object.prototype.hasOwnProperty;

	var deep = function(obj, path, value) {
	  if (arguments.length === 3) return set.apply(null, arguments);
	  return get.apply(null, arguments);
	};

	var getModel = function(key, obj) {
		// returns from app.model by default
		// the key can be a dot path like data.base.key
		// you can also reference an array index like data.base.array[0]
		// returns the property referenced by the key
		if(key) {
		  var keys = Array.isArray(key) ? key : key.split('.');
		  var obj = obj || app.model;
		  for (var i = 0; i < keys.length; i++) {
		    var key = keys[i];
		    if (!obj || !hasOwnProp.call(obj, key)) {
				var arrayIndex = key.match(/([^\]]+)\[([0-9]+)\]/);
			    if(arrayIndex && arrayIndex.length == 3) {
			    	// this key has an array index
			    	obj = obj[arrayIndex[1]];
			    	obj = obj[arrayIndex[2]];
			    } else {
			    	obj = undefined;
			    	break;
			    }
		    } else {
			    obj = obj[key]; 	
		    }
		    
		  }
		  return obj;
		}
	};
	window.getModel = getModel;


	var setModelValue = function(key, value, obj) {
		// returns from app.model by default
		// the key can be a dot path like data.base.key
		// returns the property referenced by the key
		// use by ui.setModelValue(key, value)
		if(key) {
			var keys = Array.isArray(key) ? key : key.split('.');
			var obj = obj || app.model;
			  for (var i = 0; i < keys.length - 1; i++) {
			    var key = keys[i];
			    if (deep.p && !hasOwnProp.call(obj, key)) obj[key] = {};
			    obj = obj[key];
			  }
			  obj[keys[i]] = value;
			  return value;
		} 
		
	};
	window.setModelValue = setModelValue;


	// onhashchange polyfill
	if(!window.HashChangeEvent)(function(){
		var lastURL=document.URL;
		window.addEventListener("hashchange",function(event){
			Object.defineProperty(event,"oldURL",{enumerable:true,configurable:true,value:lastURL});
			Object.defineProperty(event,"newURL",{enumerable:true,configurable:true,value:document.URL});
			lastURL=document.URL;
		});
	}());

})();