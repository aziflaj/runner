/* GLOBAL DATA DECLARATION */

var USER = {                // loged in user's data
    username: null,
    password: null,
    weight: null,
    stats: null
};

var locationCords = {       // user's location
    firstPos: null,
    secondPos: null
};

var db;                     // The database object
var distance = 0;           // The distance in a single run
var runTime = 0;            // Time in a single run
var cal = 0;                // Calories burned in a single run

var clicked = 0;            // A pseudo-boolean value which is true if the run button is clicked
var displayed = "none";     // The running mode, which can be Free, Distance, or Time.
var running = "none";

var startTime = 0;

var watch; 					// position watch 

var runButtonClicked = 0;

var timeInterval;
var distanceInterval;

var timeSelected = {
    hours: null,
    minutes: null,
    seconds: null,
    totalSeconds: null
};

var counter = {
    numberone : false,
    numbertwo : false,
    numberthree : false,
    gotext : false,
    intervalContainer: false
};

var redCircleInterval = {
    value: false,
    interval: false
};




/* END OF GLOBAL DATA DECLARATION */

/****************************************************************************/

/* FUNCTIONS TO CONNECT WITH, READ FROM AND WRITE INTO DATABASE */
var request = indexedDB.open("people"); 

/**
 * This function is called if the DB does not exist, and initializes it
 */
request.onupgradeneeded = function() {
    
    // the DB does not exist, so we create object stores and indexes
    db = request.result;
    
    // create an objectstore to store runners stored by their unique username
    var store = db.createObjectStore("runners", {keyPath: "username"});

    //username is unique (no 2 runners with the same username)
    var usernameIndex = store.createIndex("by_username","username",{unique: true});
};


/**
 * This function is called if DB exists and creates a connection of DB with
 * the variable {@code db}
 */
request.onsuccess = function() {
    db = request.result;
};


/***************************************************************************/

/* ADD THE FUNCTIONALITY OF THE APPLICATION, WITH THE GEOLOCATION MECHANISM
 * AND THE FORMULA OF CALORIES BURNED PER RUN
 */

/**
 * This function calculates the distance runned between 2 locations, the initial 
 * location {@code loc1} and temporary location {@code loc2}
 * @param {double} loc1 initial location of the user
 * @param {double} loc2 temporary location of the user
 * @returns {double} distance run by the user
 */
function calculateDistance(loc1, loc2) {
    var R = 6371; // km
    var dLat = (loc2.latitude-loc1.latitude).toRad();
    var dLon = (loc2.longitude-loc1.longitude).toRad();
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(loc1.latitude.toRad()) * Math.cos(loc2.latitude.toRad()) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d * 1000; //meters
}

Number.prototype.toRad = function() {
    return this * Math.PI / 180;
};



/** ------------------------------------------ LOGIN PAGE ---------------------------------------------------------- **/

function clickRegisterBtn(){
    $("#registerPage").removeClass("right");
    $("#registerPage").addClass("current");
    $("#index").addClass('left');

    $("#usernameRegister").val('');
    $("#passwordRegister").val('');
    $("#passwordAgainRegister").val('');
    $("#weightRegister").val('');

}

/**
 *  Ky funksion ben kalimin grafik nga loginPage tek runPage
 */
function showRunPageFromLoginPage(){
    $("#runPage").removeClass("right");
    $("#runPage").addClass("current");
    $("#index").addClass('left');
}

/**
 * This function logs the user in, and assigns their data to a global variable USER. The data assigned are used
 * for the calculation of the calories burned in a run
 * @param {string} username The username
 * @param {string} password The password
 */
function login(username, password) {
    //prepare transaction to only read from "runners"
    var tx = db.transaction("runners","readonly");
    var store = tx.objectStore("runners");
    var userIndex = store.index("by_username"); //search by username

    //search for username on DB
    var request = userIndex.get(username);

    //username exists
    request.onsuccess = function() {
        var elem = request.result;

        if(elem === undefined || elem.username === undefined || elem.password === undefined || elem.weight === undefined){
            alert(":(\n"+"Something went wrong with the login.");
            return;
        }

        var user = elem.username; //get the username from the DB
        var pass = elem.password; //get the password from the DB
        var weight = elem.weight; //get the weight from the DB
        var stats = elem.stats; //get the stats array from the DB

        if (elem !== undefined) {
            if (password === pass) {
                

                USER.username = user;
                USER.weight = weight;
                USER.stats = stats;
                USER.password = pass;

                
                showRunPageFromLoginPage();
            }

            else {
                alert("Username or password incorrect");
            }
        }
        else if (!elem) {
            //no matches found
            alert("ERROR!");
        }
    };
};

/** ----------------------------------------- Register PAGE -------------------------------------------------------- **/

/**
 * This function passes the view from the registerPage to the loginPage
 */
function clickRegisterPageBack(){
    $("#registerPage").addClass("right");
    $("#index").removeClass('left');
    $("#index").addClass('current');
}

/**
 * Event handler for the registration button, in order to sign another user up
 */
function clickRegBtn(){
    if($("#passwordRegister").val() === $("#passwordAgainRegister").val()){
        signup(
            $("#usernameRegister").val(),
            $("#passwordRegister").val(),
            $("#weightRegister").val()
        );

    }else{
        alert("Passwords don't match!");
    }
}

/**
 * This function thanks the user after the signup 
 */
function showThanksPageFromRegisterPage(){
    $("#registerPage").addClass("right");
    $("#thanksPage").removeClass("hidden");
    $("#thanksPage").addClass("current");
    setInterval(function(){$("#thanksRunButton").fadeToggle();},1500);
}

/**
 * This function signs a new user into the database. Since the username should be unique, it doesn't allow
 * for a new user to signup with an existing username. If the username entered is unique, it assigns the 
 * new user at the global variablave {@code USER} and redirects to the runPage
 * @param {string} username The new username
 * @param {string} password The password
 * @param {int} weight The user's weight in kilograms
 */
function signup(username, password, weight) {
    
    //prepare transaction to write into "runners"
    var tx = db.transaction("runners","readwrite");
    var store = tx.objectStore("runners");

    /*
    search by username in order to check if username entered
    by user exists
    */
    var userIndex = store.index("by_username");

    // username and password must be 4 characters or longer, while weight should be between 0 and 500 kg
    if(username.length < 4 || username === null){
        alert("Username should be 4 character or more");
        return;
    }else if(password.length < 4 || password === null){
        alert("Password should be 4 character or more");
        return;
    }else if(weight <= 0 || weight > 500 || weight === null){
        alert("Weight should be greater than 0");
        return;
    }

    /*
    search the database for the username
    if username exists, report to the user
    else , store in database
     */
    var request = userIndex.get(username);
    request.onsuccess = function() {
        var elem = request.result;
        if (elem === undefined) {
            var newUser = {
                username: username,
                password: password,
                weight: weight,
		        stats: []
	        };
	    store.put(newUser);
            
            //assign the new user as global USER
            USER.username = username;
            USER.weight = weight;
            USER.password = password;
            showThanksPageFromRegisterPage();

        }

        else {
            alert("Username Exists");
            return;
        }
    };

    request.onerror = function() {
        alert("ERROR!");
    };

    request.onabort = function() {
        alert(tx.error);
    };
};



/** ------------------------------------------ THANKS PAGE --------------------------------------------------------- **/
function clickThanksRunButton(){
    $("#thanksRunButton").fadeToggle();
    $("#thanksPage").removeClass("right").addClass("left").addClass("hidden");
    $("#index").removeClass("current");
    $("#runPage").removeClass("right").addClass("current");
}



/** ----------------------------------------- RUN PAGE -------------------------------------------------------- **/

/**
 * This function hides the main buttons for running mode selection
 */
function hideButtons(){
    $("#spanDistance").animate({"top": "1", "left": "1", "width": "148px", "height": "148px"}, "slow");
    $("#spanTime").animate({"top": "1", "left": "1", "width": "148px", "height": "148px"}, "slow");
    $("#spanFree").animate({"top": "1", "left": "1", "width": "148px", "height": "148px"}, "slow");
    $("#spanFree div, #spanTime div, #spanDistance div").animate({"margin-top": "10px", "margin-left": "10px", "width": "130px", "height": "130px"}, "slow");
    $("#spanRun").animate({"width": "150px", "height": "150px", "top": "0", "left": "0", "font-size": "30px", "backgroundColor": "#EEEF8C"}, "easein");
    $("#spanRun div").animate({"width": "130px", "height": "130px", "margin-top": "10px", "margin-left": "10px", "backgroundColor": "#F6921C"}, "easeout");
    $("#spanRun div img").animate({"height": "90px", "width": "90px", "margin-top": "18px", "margin-left": "18px"}, "easeout");
}

/**
 * This function shows the main buttons for running mode selection 
 */
function showButtons(){
    $("#spanDistance").show().animate({"top": "-75px", "left": "-75px", "width": "100px", "height": "100px" , "backgroundColor": "#334D5C"}, "slow");
    $("#spanTime").show().animate({"top": "-75px", "left": "125px", "width": "100px", "height": "100px", "backgroundColor": "#334D5C"}, "slow");
    $("#spanFree").show().animate({"top": "150px", "left": "25", "width": "100px", "height": "100px", "backgroundColor": "#334D5C"}, "slow");
    $("#spanFree div, #spanTime div, #spanDistance div").animate({"margin-top": "2px", "margin-left": "2px", "width": "96px", "height": "96px", "backgroundColor": "white"}, "slow");
    $("#spanFree div img, #spanTime div img, #spanDistance div img").animate({"margin-top": "7px", "margin-left": "7px", "width": "75px", "height": "75px"}, "slow");
    $("#spanRun").animate({"width": "120px", "height": "120px", "top": "15", "left": "15", "font-size": "20px", "backgroundColor": "#F6921C"}, "easeout");
    $("#spanRun div").animate({"width": "112px", "height": "112px", "margin-top": "4px", "margin-left": "4px", "backgroundColor": "white"}, "easeout");
    $("#spanRun div img").animate({"height": "80px", "width": "80px", "margin-top": "18px", "margin-left": "18px"}, "easeout");
}

/**
 * This function is executed when a running mode button is clicked 
 */
function clickButton(name){

    $("#close").slideUp();
    hideButtons();
    $("#spanRun div").animate({"backgroundColor": "white"});
    $("#spanRun").animate({"backgroundColor": "#334D5C"}, "slow");
    displayed = name;
    $("#close").show();

    if(name === "Distance"){
        $("#spanRun div img").prop("src", "static/images/road_icon.png");
        $("#spanDistanceCont input").show().val('');
        $("#spanDistanceCont").slideDown();
    }else if(name === "Time"){
        $("#spanRun div img").prop("src", "static/images/stopwatch_icon_2.png");
        $("#spanTimeCont input").show().val('');
        $("#spanTimeCont").slideDown();
    }else if(name === "Free"){
        $("#freeCont").slideDown();
        $(".freeContText").slideDown();
    }

    running = "Run";
}

/**
 * This function is executed everytime the location is generated. It finds the 
 * location in two different places of the runner and calculates the distance
 * of the overall run.
 * @param Position
 */
function location_success(position) {
	if(locationCords.firstPos === null){
		locationCords.firstPos = position.coords;
	}else{
		locationCords.secondPos = locationCords.firstPos;
		locationCords.firstPos = position.coords;
		distance += calculateDistance(locationCords.secondPos, locationCords.firstPos);
	}

} 

/**
 * This function is executed everytime the location is not generated. It shows 
 * the kind of error that happens
 * @param Error
 */
function location_error(error) {
	switch(error.code){
	case error.PERMISSION_DENIED:
	  alert("User denied the request for Geolocation.");
	  break;
	case error.POSITION_UNAVAILABLE:
	  alert("Location information is unavailable.");
	  break;
	case error.TIMEOUT:
	  alert("The request to get user location timed out.");
	  break;
	case error.UNKNOWN_ERROR:
	  alert("An unknown error occurred.");
	  break;
	}

}

/**
 * This function is called everytime the run button is clicked. It starts or 
 * stops the position and distance calculator
 */
function getLocation() {
    watch = navigator.geolocation.watchPosition(
				location_success,
				location_error,
				{
					enableHighAccuracy: true
					//maximumAge: 30000,
					//timeout: 27000
				}
	);
}

function timeLeft(){

    var thisTime = new Date().getTime();

    if(displayed === "Time"){
        var secondLeft = timeSelected.totalSeconds - Math.floor((thisTime - startTime)/ 1000);

        var hours = Math.floor(secondLeft/3600);
        var minutes = Math.floor((secondLeft - (hours * 3600))/60);
        var seconds = Math.floor(secondLeft - (hours * 3600) - (minutes * 60));

        $("#runPageHours").html(hours);
        $("#runPageMinutes").html(minutes);
        $("#runPageSeconds").html(seconds);

        if(Math.floor((thisTime - startTime)/ 1000) > timeSelected.totalSeconds){

            $("#spanRun").trigger('click');
            return;
        }
    }else if(displayed === "Distance"){
        $("#distanceCont em").html(distanceSelected - Math.floor(distance));
        if(Math.floor(distance) >= Math.floor(distanceSelected)){
            $("#spanRun").trigger('click');
        }
    }else if(displayed == "Free"){
        var seconds = Math.floor((thisTime - startTime)/ 1000);

        var hours = Math.floor(seconds/3600);
        var minutes = Math.floor((seconds - (hours * 3600))/60);
        var seconds = Math.floor(seconds - (hours * 3600) - (minutes * 60));

        $(".hours").html(hours);
        $(".minutes").html(minutes);
        $(".seconds").html(seconds);
        $(".distance").html(Math.floor(distance));
    }

}

function showResultsFromRun(){
    
    // passing from runPage to results
    $("#runPage").addClass("right");
    $("#viewResultsPage").removeClass("hidden");
    $("#viewResultsPage").addClass("current");


    var hours = Math.floor(runTime/3600);
    var minutes = Math.floor((runTime - (hours * 3600))/60);
    var seconds = Math.floor(runTime - (hours * 3600) - (minutes * 60));

    // printing the run results
    $("#spanHours").html(hours);
    $("#spanMinutes").html(minutes);
    $("#spanSeconds").html(seconds);
    $("#avarageSpeed em").html(parseFloat(distance/runTime).toFixed(2));

    $("#resMeters em").html(Math.floor(distance));
    $("#resCalories em").html(Math.floor(cal));


    $("#viewResultsPage button").on("click", function(){
        $("#runPage").removeClass("right");
        $("#viewResultsPage").addClass("hidden");
        $("#viewResultsPage").removeClass("current");
        $('.run-navigation').show();
        $("#close").hide();
        $("#runButton").hide();
        $("#selectRunCont").show();

        // Reseting every variable
        distance = 0;
        locationCords.firstPos = null;
        locationCords.secondPos = null;
        runTime = 0;
        cal = 0;
        startTime = 0;
        timeSelected.hours = null;
        timeSelected.minutes = null;
        timeSelected.seconds = null;
        timeSelected.totalSeconds = null;
    });
}

function showNavBar(){
    $(".navBar").stop().animate({backgroundColor: "#F6921C"}, 500, function(){
        $(this).find(".run-navigation").fadeIn();
    }); 
}

function hideNavBar(){
    $(".navBar").stop().animate({backgroundColor: "#334D5C"}, 500, function(){
        $(this).find(".run-navigation").fadeOut();
    });
}

/**
 * This function makes the update of the user's data
 */
function makeUpdate() {

    var newPassword = $("#passwordEdit").val();                 
    var repeatedPassword = $("#passwordAgainEdit").val();
    var newWeight = $("#weightEdit").val();

    if(USER.password === $("#passwordOld").val()){              
        if( (newPassword === repeatedPassword) && (newPassword.length > 3) ){
            USER.password = newPassword;
        }else{
            alert("A problem in the new password!");
            return null;
        }

    }else{
        alert("Your old password is wrong");
        return null;
    }

    if(newWeight > 0){                                          
        USER.weight = newWeight;
    }else{
        alert("The weight should be greater than 0!");
        return null;
    }

    db.transaction("runners","readwrite")  // Updating the DB
      .objectStore("runners")
      .put(USER);

}

/**
 * This function calculates the calories burned using the distance runned and the user's weight
 * @param {double} distance The distance runned
 * @returns {double} Calories burned
 */
function calsBurned(distance){
    return 0.75 * (USER.weight) * (1.6 * distance/1000);
}