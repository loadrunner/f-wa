"use strict";
var app = angular.module('facturi', ['ngRoute', 'ngResource']);

// Define Routing for app
// Uri /AddNewOrder -> template add_order.html and Controller AddOrderController
// Uri /ShowOrders -> template show_orders.html and Controller
// AddOrderController
app.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/', {
		templateUrl : 'templates/index.html',
		controller : 'IndexController'
	}).when('/clients', {
		templateUrl : 'templates/clients/index.html',
		controller : 'ClientsController'
	}).when('/login', {
		templateUrl : 'templates/login.html',
		controller : 'LoginController'
	}).when('/clients/show', {
		templateUrl : 'templates/clients/get.html',
		controller : 'GetClientController'
	}).when('/clients/add', {
		templateUrl : 'templates/clients/post.html',
		controller : 'PostClientController'
	}).when('/clients/edit', {
		templateUrl : 'templates/clients/put.html',
		controller : 'PutClientController'
	}).when('/clients/delete', {
		templateUrl : 'templates/clients/delete.html',
		controller : 'DeleteClientController'
	}).when('/invoices', {
		templateUrl : 'templates/invoices/index.html',
		controller : 'ClientsController'
	}).when('/invoices/show', {
		templateUrl : 'templates/invoices/get.html',
		controller : 'GetClientController'
	}).when('/invoices/add', {
		templateUrl : 'templates/invoices/post.html',
		controller : 'PostClientController'
	}).when('/invoices/edit', {
		templateUrl : 'templates/invoices/put.html',
		controller : 'PutClientController'
	}).when('/invoices/delete', {
		templateUrl : 'templates/invoices/delete.html',
		controller : 'DeleteClientController'
	}).when('/receipts', {
		templateUrl : 'templates/receipts/index.html',
		controller : 'ClientsController'
	}).when('/receipts/show', {
		templateUrl : 'templates/receipts/get.html',
		controller : 'GetClientController'
	}).when('/receipts/add', {
		templateUrl : 'templates/receipts/post.html',
		controller : 'PostClientController'
	}).when('/receipts/edit', {
		templateUrl : 'templates/receipts/put.html',
		controller : 'PutClientController'
	}).when('/receipts/delete', {
		templateUrl : 'templates/receipts/delete.html',
		controller : 'DeleteClientController'
	}).otherwise({
		redirectTo : '/'
	});
}]);

app.run(['$rootScope', '$location', '$http', 'AuthenticationService', function ($rootScope, $location, $http, AuthenticationService) {
	$rootScope.globals = $rootScope.globals || {};//TODO: use local storage
	if (localStorage.hasOwnProperty('access_token')) {
		AuthenticationService.login(localStorage.access_token);
	}
	
	$rootScope.logout = AuthenticationService.logout;
	
	$rootScope.$on('$locationChangeStart', function (event, next, current) {
		if (['/login', '/register'].indexOf($location.path()) >= 0) {
			if ($rootScope.globals.current_user)
				$location.path('/');
		} else {
			if (!$rootScope.globals.current_user)
				$location.path('/login');
		}
	});
}]);

///FLASH IDIOT SERVICE
app.factory('FlashService', ['$rootScope', function ($rootScope) {
	var service = {};
	service.success = function (message, keepAfterLocationChange) {
		$rootScope.flash = {
			message: message,
			type: 'success', 
			keepAfterLocationChange: keepAfterLocationChange
		};
	};
	service.error = function (message, keepAfterLocationChange) {
		$rootScope.flash = {
			message: message,
			type: 'error',
			keepAfterLocationChange: keepAfterLocationChange
		};
	};
	
	$rootScope.$on('$locationChangeStart', function () {
		if ($rootScope.flash) {
			if (!$rootScope.flash.keepAfterLocationChange)
				delete $rootScope.flash;
			else
				$rootScope.flash.keepAfterLocationChange = false;
		}
	});
	
	return service;
}]);

app.factory('AuthenticationService', ['$http', '$rootScope', '$location', 'UserService', function ($http, $rootScope, $location, UserService) {
	var service = {};
	
	service.getAccessToken = function (username, password, callback) {
		$http({
			url     : 'http://10.10.0.3/api/oauth/token',
			method  : 'POST',
			data    : {
				grant_type    : 'password',
				client_id     : 'test_cl',
				client_secret : 'big_s',
				username      : username,
				password      : password
			}
		}).success(function (response) {
			if (response && response.access_token)
				callback({
					success      : true,
					access_token : response.access_token
				});
			else
				callback({
					success : false,
					message : 'Username or password is incorrect'
				});
		}).error(function (response) {
			console.log("response ", response);
			callback({
				success : false,
				message : 'Username or password is incorrect'
			});
		});
	};
	service.login = function (accessToken, callback) {
		callback = callback || function () {};
		
		//TODO: get user details from API
		$rootScope.globals.current_user = {
			username     : 'fakeusername', 
			access_token : accessToken
		};
		
		if (localStorage.access_token != accessToken)
			localStorage.access_token = accessToken;
		
		callback();
	};
	service.logout = function () {
		delete $rootScope.globals.current_user;
		delete localStorage.access_token;
		$location.path('/login');
	};
	
	return service;
}]);

app.factory('UserService', ['$timeout', '$filter', '$q', function ($timeout, $filter, $q) {
	var getUsers = function () {
		if(!localStorage.users)
			localStorage.users = JSON.stringify([]);
		
		return JSON.parse(localStorage.users);
	};
	
	var setUsers = function (users) {
		localStorage.users = JSON.stringify(users);
	};
	
	var service = {};
	
	service.GetAll = function () {
		var deferred = $q.defer();
		deferred.resolve(getUsers());
		return deferred.promise;
	};
	service.GetById = function (id) {
		var deferred = $q.defer();
		var filtered = $filter('filter')(getUsers(), { id: id });
		var user = filtered.length ? filtered[0] : null;
		deferred.resolve(user);
		return deferred.promise;
	};
	service.GetByUsername = function (username) {
		var deferred = $q.defer();
		var filtered = $filter('filter')(getUsers(), { username: username });
		var user = filtered.length ? filtered[0] : null;
		deferred.resolve(user);
		return deferred.promise;
	};
	service.Create = function (user) {
		var deferred = $q.defer();
		
		// simulate api call with $timeout
		$timeout(function () {
			GetByUsername(user.username)
				.then(function (duplicateUser) {
					if (duplicateUser !== null) {
						deferred.resolve({ success: false, message: 'Username "' + user.username + '" is already taken' });
					} else {
						var users = getUsers();
						
						// assign id
						var lastUser = users[users.length - 1] || { id: 0 };
						user.id = lastUser.id + 1;
						
						// save to local storage
						users.push(user);
						setUsers(users);
						
						deferred.resolve({ success: true });
					}
				});
		}, 1000);
		
		return deferred.promise;
	};
	service.Update = function (user) {
		var deferred = $q.defer();
		
		var users = getUsers();
		for (var i = 0; i < users.length; i++) {
			if (users[i].id === user.id) {
				users[i] = user;
				break;
			}
		}
		setUsers(users);
		deferred.resolve();
		
		return deferred.promise;
	};
	service.Delete = function (id) {
		var deferred = $q.defer();
		
		var users = getUsers();
		for (var i = 0; i < users.length; i++) {
			var user = users[i];
			if (user.id === id) {
				users.splice(i, 1);
				break;
			}
		}
		setUsers(users);
		deferred.resolve();
		
		return deferred.promise;
	};
	
	return service;
}]);
////////////////

app.controller('LoginController', ['$scope', '$location', '$rootScope', 'AuthenticationService', 'FlashService', function ($scope, $location, $rootScope, AuthenticationService, FlashService) {
	$scope.register = function() {
		$scope.dataLoading = true;
		UserService.Create($scope.user).then(function (response) {
			if (response.success) {
				FlashService.success('Registration successful', true);
				$location.path('/login');
			} else {
				FlashService.error(response.message);
				$scope.dataLoading = false;
			}
		});
	};
	
	$scope.login = function () {
		$scope.dataLoading = true;
		AuthenticationService.getAccessToken($scope.username, $scope.password, function (response) {
			if (response.success) {
				AuthenticationService.login(response.access_token, function () {
					$location.path('/');
				});
			} else {
				FlashService.error(response.message);
				$scope.dataLoading = false;
			}
		});
	};
}]);

app.controller('MenuController', function($scope, $location) {
	$scope.message = 'Index';
	$scope.getClass = function (page) {
		var current = $location.path();
		return current.match('^\/'+page+'\(/([a-zA-Z0-9\-\_]+))?$') ? "active" : "";
	};
});

app.controller('IndexController', function($scope, $location) {
	$scope.message = 'Index';
});


app.factory('Client', function($resource) {
	return $resource('http://10.10.0.3/api/clients/:id', {}, {
		get : {
			method  : 'GET',
			headers : {
				'Authorization' : 'Bearer ' + localStorage.access_token
			}
		}, insert : {
			method  : 'POST',
			headers : {
				'Authorization' : 'Bearer ' + localStorage.access_token
			}
		}, save : {
			method  : 'PUT',
			headers : {
				'Authorization' : 'Bearer ' + localStorage.access_token
			}
		}, remove : {
			method  : 'DELETE',
			headers : {
				'Authorization' : 'Bearer ' + localStorage.access_token
			}
		}, query : {
			method  : 'GET',
			isArray : true,
			headers : {
				'Authorization' : 'Bearer ' + localStorage.access_token
			}
		}
	});
});

app.controller('ClientsController', ['$scope', '$location', 'Client', function($scope, $location, Client) {
	$scope.message = 'This is list clients screen';
	$scope.menuClass = function (page) {
		var current = $location.path();
		return current.match('^\/clients(\/)?'+page+'$') ? "active" : "";
	};
	$scope.clients = Client.query();
}]);

app.controller('GetClientController', function($scope, $location) {
	$scope.message = 'This is show client screen';
});

app.controller('PostClientController', ['$scope', '$location', 'Client', function($scope, $location, Client) {
	$scope.message = 'This is add client screen';
	$scope.submit = function () {
		if (!$scope.name || $scope.name.length < 1)
			return;
		
		var client = new Client({
			name : $scope.name
		});
		client.$insert(function (res) {
			if (res.$resolved !== true)
				return;
			
			$location.path('/clients');
		});
	};
}]);

app.controller('PutClientController', function($scope, $location) {
	$scope.message = 'This is edit client screen';
});

app.controller('DeleteClientController', function($scope, $location) {
	$scope.message = 'This is remove client screen';
});
