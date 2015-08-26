"use strict";
var app = angular.module('facturi.clients', ['ngRoute', 'ngResource']);

app.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/clients', {
		templateUrl : 'templates/clients/index.html',
		controller : 'ClientsController'
	}).when('/clients/show/:id', {
		templateUrl : 'templates/clients/get.html',
		controller : 'GetClientController'
	}).when('/clients/add', {
		templateUrl : 'templates/clients/add.html',
		controller : 'AddClientController'
	}).when('/clients/edit/:id', {
		templateUrl : 'templates/clients/edit.html',
		controller : 'EditClientController'
	});
}]);

app.factory('Client', function($resource) {
	return $resource('/api/clients/:_id', {
		_id : "@_id"
	}, {
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
	$scope.remove = function (id) {
		Client.remove({ _id : id }, function (r) {
			console.log(r);
			for (var i = 0; i < $scope.clients.length; i++)
				if ($scope.clients[i]._id == id) {
					$scope.clients.splice(i, 1);
					break;
				}
		});
	};
}]);

app.controller('GetClientController', ['$scope', '$location', '$routeParams', 'Client', function($scope, $location, $routeParams, Client) {
	$scope.message = 'This is show client screen';
	$scope.client = Client.get({_id : $routeParams.id});
}]);

app.controller('AddClientController', ['$scope', '$location', 'Client', function($scope, $location, Client) {
	$scope.message = 'This is add client screen';
	$scope.client = {};
	$scope.submit = function () {
		if (!$scope.client.name || $scope.client.name < 1)
			return;
		
		var client = new Client($scope.client);
		client.$insert(function (res) {
			if (res.$resolved !== true)
				console.log('a');
			
			$location.path('/clients');
		}, function (err) {
			console.log(err.data);
			alert(err.data.message);
		});
	};
}]);

app.controller('EditClientController', ['$scope', '$location', '$routeParams', 'Client', function($scope, $location, $routeParams, Client) {
	$scope.message = 'This is edit client screen';
	$scope.client = Client.get({_id : $routeParams.id});
	$scope.submit = function () {
		$scope.client.$save(function () {
			$location.path('/clients');
		});
	};
}]);
