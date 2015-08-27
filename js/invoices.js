"use strict";
var app = angular.module('facturi.invoices', ['ngRoute', 'ngResource']);

app.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/invoices', {
		templateUrl : 'templates/invoices/index.html',
		controller : 'InvoicesController'
	}).when('/invoices/show/:id', {
		templateUrl : 'templates/invoices/get.html',
		controller : 'GetInvoiceController'
	}).when('/invoices/add', {
		templateUrl : 'templates/invoices/add.html',
		controller : 'AddInvoiceController'
	}).when('/invoices/edit/:id', {
		templateUrl : 'templates/invoices/edit.html',
		controller : 'EditInvoiceController'
	});
}]);

app.factory('Invoice', function($resource) {
	return $resource('/api/invoices/:_id', {
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

app.controller('InvoicesController', ['$scope', '$location', 'Invoice', function($scope, $location, Invoice) {
	$scope.message = 'This is list invoices screen';
	$scope.menuClass = function (page) {
		var current = $location.path();
		return current.match('^\/invoices(\/)?'+page+'$') ? "active" : "";
	};
	$scope.invoices = Invoice.query();
	$scope.remove = function (id) {
		Invoice.remove({ _id : id }, function (r) {
			console.log(r);
			for (var i = 0; i < $scope.invoices.length; i++)
				if ($scope.invoices[i]._id == id) {
					$scope.invoices.splice(i, 1);
					break;
				}
		});
	};
}]);

app.controller('GetInvoiceController', ['$scope', '$location', '$routeParams', 'Invoice', function($scope, $location, $routeParams, Invoice) {
	$scope.message = 'This is show invoice screen';
	$scope.invoice = Invoice.get({_id : $routeParams.id});
}]);

app.controller('AddInvoiceController', ['$scope', '$location', 'Invoice', 'Client', function($scope, $location, Invoice, Client) {
	$scope.message = 'This is add invoice screen';
	$scope.clients = Client.query();
	$scope.client = {
		_id  : '',
		name : '',
		cui  : ''
	};
	$scope.select_client = function () {
		if ($scope.source_client) {
			$scope.client._id = $scope.source_client._id;
			$scope.client.name = $scope.source_client.name;
			$scope.client.cui = $scope.source_client.cui;
		} else {
			$scope.client._id = '';
			$scope.client.name = '';
			$scope.client.cui = '';
		}
	};
	$scope.submit = function () {
		if (!$scope.number || $scope.number.length < 1
		 || !$scope.client.name || !$scope.client.cui)
			return; //not sure if needed; data already validated
		
		var invoice = new Invoice({
			number    : $scope.number,
			client    : $scope.client
		});
		invoice.$insert(function (res) {
			if (res.$resolved !== true)
				return;
			
			$location.path('/invoices');
		});
	};
}]);

app.controller('EditInvoiceController', ['$scope', '$location', '$routeParams', 'Invoice', 'Client', function($scope, $location, $routeParams, Invoice, Client) {
	$scope.message = 'This is edit invoice screen';
	$scope.invoice = Invoice.get({_id : $routeParams.id}, function (invoice) {
		$scope.clients = Client.query({}, function (clients) {
			if (invoice.client._id) {
				clients.forEach(function (client) {
					if (client._id == invoice.client._id)
						$scope.source_client = client;
				});
			}
		});
	});
	$scope.select_client = function () {
		if ($scope.source_client) {
			$scope.invoice.client._id = $scope.source_client._id;
			$scope.invoice.client.name = $scope.source_client.name;
			$scope.invoice.client.cui = $scope.source_client.cui;
		} else {
			$scope.invoice.client._id = '';
		}
	};
	$scope.submit = function () {
		$scope.invoice.$save(function () {
			$location.path('/invoices');
		});
	};
}]);