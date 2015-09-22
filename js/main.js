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
				$rootScope.globals.old_path = $location.path();
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
			if (!$rootScope.globals.current_user) {
				$rootScope.globals.old_path = $location.path();
				$location.path('/login');
			} else {
				$rootScope.globals.old_path = null;
			}
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
						if ($rootScope.globals.old_path) {
							$location.path($rootScope.globals.old_path);
							$rootScope.globals.old_path = null;
						} else {
							$location.path('/');
						}
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

app.filter('numberFixedLen', function () {
	return function (a, b) {
		var s = a + "";
		if (s.length > b || s.length > 8)
			return s;
		
		return (1e9 + s).slice(-b);
	};
});

app.filter('toStringRO', function () {
	// numerele literal
	var $na = ["", "Unu", "Doi", "Trei", "Patru", "Cinci", "Sase", "Sapte", "Opt", "Noua"];
	var $nb = ["", "Un",  "Doua", "Trei", "Patru", "Cinci", "Sase", "Sapte", "Opt", "Noua"];
	var $nc = ["", "Una", "Doua","Trei", "Patru", "Cinci", "Sase", "Sapte", "Opt", "Noua"];
	var $nd = ["", "Unu", "Doua", "Trei", "Patru", "Cinci", "Sase", "Sapte", "Opt", "Noua"];
	
	// exceptie "saizeci"
	var $ex1 = 'Sai';
	
	// unitati
	var $ua = ["", "Zece", "Zeci", "Zeci","Zeci","Zeci","Zeci","Zeci","Zeci","Zeci"];
	var $ub = ["", "Suta", "Sute", "Sute","Sute","Sute","Sute","Sute","Sute","Sute"];
	var $uc = ["", "Mie", "Mii"];
	var $ud = ["", "Milion", "Milioane"];
	var $ue = ["", "Miliard", "Miliarde"];
	
	// legatura intre grupuri
	var $lg1 = ["", "Spre", "Spre", "Spre", "Spre", "Spre", "Spre", "Spre", "Spre", "Spre"];
	var $lg2 = ["", "", "Si",  "Si", "Si", "Si", "Si", "Si", "Si", "Si" ];
	
	// moneda
	var $mon = ["", " leu", " lei"];
	var $ban = ["", " ban ", " bani "];
	
	return function (val) {
		if (!val)
			return '';
		
		var $NrI = ("000000000000" + parseInt(val)).slice(-12);
		var $Zec = String(parseInt(val * 100)).slice(-2);
		
		// grupul 4 (miliarde)
		var $Gr = $NrI.slice(0, 3);
		var $n1 = parseInt($NrI[0]);
		var $n2 = parseInt($NrI[1]);
		var $n3 = parseInt($NrI[2]);
		var $Rez = $nc[$n1] + $ub[$n1];
		if ($n2 == 1)
			$Rez += $nb[$n3] + $lg1[$n3] + $ua[$n2];
		else
			$Rez += ($n2==6 ? $ex1 : $nc[$n2]) + $ua[$n2] + $lg2[$n2] + ($Gr=="001" || $Gr=="002" ? $nb[$n3] : $nd[$n3]);
		if ($Gr != "000")
			$Rez += $Gr == "001" ? $ue[1] : $ue[2];
		
		// grupul 3 (milioane)
		var $Gr = $NrI.slice(3, 6);
		var $n1 = parseInt($NrI[3]);
		var $n2 = parseInt($NrI[4]);
		var $n3 = parseInt($NrI[5]);
		$Rez += $nc[$n1] + $ub[$n1];
		if ($n2 == 1)
			$Rez += $nb[$n3] + $lg1[$n3] + $ua[$n2];
		else
			$Rez += ($n2 == 6 ? $ex1 : $nc[$n2]) + $ua[$n2] + $lg2[$n2] + ($Gr == "001" || $Gr=="002" ? $nb[$n3] : $nd[$n3]);
		if ($Gr != "000")
			$Rez += $Gr == "001" ? $ud[1] : $ud[2];
		
		// grupul 2 (mii)
		var $Gr = $NrI.slice(6, 9);
		var $n1 = parseInt($NrI[6]);
		var $n2 = parseInt($NrI[7]);
		var $n3 = parseInt($NrI[8]);
		$Rez += $nc[$n1] + $ub[$n1];
		if ($n2 == 1)
			$Rez += $nb[$n3] + $lg1[$n3] + $ua[$n2]
		else
			$Rez += ($n2 == 6 ? $ex1 : $nc[$n2]) + $ua[$n2] + $lg2[$n2] + ($Gr=="001" || $Gr=="002" ? $nc[$n3] : $nd[$n3]);
		if ($Gr != "000")
			$Rez += $Gr == "001" ? $uc[1] : $uc[2];
		
		// grupul 1 (unitati)
		var $Gr = $NrI.slice(9, 12);
		var $n1 = parseInt($NrI[9]);
		var $n2 = parseInt($NrI[10]);
		var $n3 = parseInt($NrI[11]);
		$Rez += $nc[$n1] + $ub[$n1];
		if ($n2 == 1)
			$Rez += $nb[$n3] + $lg1[$n3] + $ua[$n2] + $mon[2];
		else
			$Rez += ($n2 == 6 ? $ex1 : $nc[$n2]) + $ua[$n2] + ($n3 > 0 ? $lg2[$n2] : '') + ($NrI=="000000000001" ? ($nb[$n3] + $mon[1]) : ($na[$n3]) + $mon[2]);
		
		if (parseInt($NrI) == 0)
			$Rez = "";
		
		// banii
		if (parseInt($Zec) > 0) {
			$n2 = $Zec.slice(0, 1);
			$n3 = $Zec.slice(1, 2)
			$Rez += ' si ';
			var $lg22 = ($n3 == '0' ? '' : $lg2[$n2]);
			if ($n2 == 1)
				$Rez += $nb[$n3] . $lg1[$n3] . $ua[$n2].$ban[2];
			else
				$Rez += ($n2 == 6 ? $ex1 : $nc[$n2]) + $ua[$n2] + $lg22 + ($Zec == "01" ? $nb[$n3] + $ban[1] : $na[$n3] + $ban[2]);
		}
		
		return $Rez;
	};
});
