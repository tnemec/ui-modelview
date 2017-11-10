


var app = {

	model : {
		value1 : 'Foo',
		counter : 0,
		counterText: 'time',
		firstName: 'Sam',
		colorList: ['Red','Blue','Orange','Purple','Green'],
		userList: [{firstName:'Sam',lastName:'Jones',age:35}, {firstName:'Linda',lastName:'Jones',age:32},{firstName:'Joey',lastName:'Jones',age:15}],
		saved: false
	}
}



var ui = window.ui;

if(ui) {
	ui.actions = {
		"changeValue" : function() {
    		app.model.value1 = (app.model.value1 == "Foo") ? "Bar" : "Foo";
			ui.refresh();
		},
		"saveData" : function() {
    		app.model.saved = (app.model.saved == true) ? false : true;
			ui.refresh();			
		}
	};

	ui.pageActions = {
		"incrementCounter" : function() {
			app.model.counter++;
			if(app.model.counter > 1) app.model.counterText = 'times'
			ui.refresh();
		}
	}

	ui.init('home');
}