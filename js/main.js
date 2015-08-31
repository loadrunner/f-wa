"use strict";
var app = angular.module('facturi', ['ngRoute', 'ngResource', 'facturi.clients', 'facturi.products', 'facturi.invoices', 'facturi.receipts']);

app.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/', {
		templateUrl : 'templates/index.html',
		controller : 'IndexController'
	}).when('/login', {
		templateUrl : 'templates/login.html',
		controller : 'LoginController'
	}).otherwise({
		redirectTo : '/'
	});
}]);

app.run(['$rootScope', '$location', '$http', 'AuthenticationService', function ($rootScope, $location, $http, AuthenticationService) {
	$rootScope.globals = $rootScope.globals || {};//TODO: use local storage
	if (localStorage.hasOwnProperty('access_token')) {
		$rootScope.globals.loading = true; // TODO: add visual loading overlay
		AuthenticationService.login(localStorage.access_token, function (response) {
			$rootScope.globals.loading = false;
			
			if (!response.success) {
				AuthenticationService.logout();
				$location.path('/login');
			}
		});
	}
	
	$rootScope.logout = AuthenticationService.logout;
	
	$rootScope.$on('$locationChangeStart', function (event, next, current) {
		if ($rootScope.globals.loading)
			return;
		
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
			url     : '/api/oauth/token',
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
				message : 'API Error'
			});
		});
	};
	service.login = function (accessToken, callback) {
		callback = callback || function () {};
		
		UserService.getUserInfo(accessToken, function (response) {
			if (!response.success)
				return callback(response);
			
			$rootScope.globals.current_user = response.user;
			
			if (localStorage.access_token != accessToken)
				localStorage.access_token = accessToken;
			
			callback({ success: true });
		});
		
		//TODO: maybe refresh access token
	};
	service.logout = function () {
		delete $rootScope.globals.current_user;
		delete localStorage.access_token;
		$location.path('/login');
	};
	
	return service;
}]);

app.factory('UserService', ['$http', function ($http) {
	var service = {};
	
	service.getUserInfo = function (accessToken, callback) {
		callback = callback || {};
		
		$http({
			url     : '/api/users/me',
			method  : 'get',
			headers : {
				'Authorization' : 'Bearer ' + accessToken
			}
		}).success(function (response) {
			if (response)
				callback({
					success : true,
					user    : response
				});
			else
				callback({
					success : false,
					message : 'Generic error'
				});
		}).error(function (response) {
			console.log("UserInfo error: ", response);
			callback({
				success : false,
				message : 'API error'
			});
		});
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
	
	return service;
}]);

app.controller('LoginController', ['$scope', '$location', '$rootScope', 'AuthenticationService', 'UserService', 'FlashService', function ($scope, $location, $rootScope, AuthenticationService, UserService, FlashService) {
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
				AuthenticationService.login(response.access_token, function (response) {
					if (response.success) {
						$location.path('/');
					} else {
						FlashService.error(response.message);
						$scope.dataLoading = false;
					}
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
		return current.match('^\/'+page+'(\/.+)?$') ? "active" : "";
	};
});

app.controller('IndexController', function($scope, $location) {
	$scope.message = 'Index';
});

