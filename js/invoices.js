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
	}).when('/invoices/edit-2/:id', {
		templateUrl : 'templates/invoices/edit-2.html',
		controller : 'EditStep2InvoiceController'
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
	$scope.invoices = Invoice.query();
	$scope.remove = function (id) {
		Invoice.remove({ _id : id }, function (r) {
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
	$scope.clients = Client.query();
	$scope.client = {};
	$scope.select_client = function () {
		if ($scope.source_client) {
			$scope.client._id          = $scope.source_client._id;
			$scope.client.name         = $scope.source_client.name;
			$scope.client.cif          = $scope.source_client.cif;
			$scope.client.address      = $scope.source_client.address;
			$scope.client.city         = $scope.source_client.city;
			$scope.client.county       = $scope.source_client.county;
			$scope.client.country      = $scope.source_client.country;
			$scope.client.bank_name    = $scope.source_client.bank_name;
			$scope.client.bank_account = $scope.source_client.bank_account;
		} else {
			$scope.client = {};
		}
	};
	$scope.submit = function () {
		if (!$scope.number || $scope.number.length < 1)
			return; //not sure if needed; data already validated
		
		var invoice = new Invoice({
			number    : $scope.number,
			client    : $scope.client
		});
		invoice.$insert(function (res) {
			if (res.$resolved !== true)
				return;
			
			$location.path('/invoices');
		}, function (err) {
			console.log(err.data);
			alert(err.data.message);
		});
	};
}]);

app.controller('EditInvoiceController', ['$scope', '$location', '$routeParams', 'Invoice', 'Client', function($scope, $location, $routeParams, Invoice, Client) {
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
			$scope.invoice.client._id          = $scope.source_client._id;
			$scope.invoice.client.name         = $scope.source_client.name;
			$scope.invoice.client.cif          = $scope.source_client.cif;
			$scope.invoice.client.address      = $scope.source_client.address;
			$scope.invoice.client.city         = $scope.source_client.city;
			$scope.invoice.client.county       = $scope.source_client.county;
			$scope.invoice.client.country      = $scope.source_client.country;
			$scope.invoice.client.bank_name    = $scope.source_client.bank_name;
			$scope.invoice.client.bank_account = $scope.source_client.bank_account;
		} else {
			$scope.invoice.client._id = '';
		}
	};
	$scope.submit = function () {
		$scope.invoice.$save(function () {
			$location.path('/invoices/edit-2/' + $routeParams.id);
		}, function (err) {
			console.log(err.data);
			alert(err.data.message);
		});
	};
}]);

app.controller('EditStep2InvoiceController', ['$scope', '$location', '$routeParams', '$http', 'Invoice', 'Product', function($scope, $location, $routeParams, $http, Invoice, Product) {
	$scope.invoice = Invoice.get({_id : $routeParams.id}, function (invoice) {
		invoice.products = invoice.products || [];
		
		$scope.products = Product.query();
	});
	$scope.add_product = function () {
		if (!$scope.invoice || !$scope.invoice.products)
			return;
		
		if ($scope.source_product) {
			
			for (var i = 0; i < $scope.invoice.products.length; i++)
				if ($scope.invoice.products[i]._id == $scope.source_product._id) {
					$scope.invoice.products[i].quantity++;
					return;
				}
			
			$scope.invoice.products.push({
				_id      : $scope.source_product._id,
				name     : $scope.source_product.name,
				price    : $scope.source_product.price,
				quantity : 1
			});
			
			$scope.source_product = {};
		} else {
			$scope.invoice.products.push({
				name     : '',
				price    : '',
				quantity : 1
			});
		}
	};
	$scope.sum = function () {
		if (!$scope.invoice || !$scope.invoice.products)
			return 0;
		
		var sum = 0;
		for (var i = 0; i < $scope.invoice.products.length; i++) {
			var product = $scope.invoice.products[i];
			if (product.price && product.quantity)
				sum += product.price * product.quantity;
		}
		return sum;
	};
	$scope.submit = function () {
		$http({
			url     : '/api/invoices/'+$scope.invoice._id+'/products',
			method  : 'POST',
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			data    : $scope.invoice.products
		}).success(function (response) {
			$location.path('/invoices');
		}).error(function (response) {
			console.log(response);
			alert(response);
		});
	};
}]);
