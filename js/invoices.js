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
	}).when('/invoices/edit-3/:id', {
		templateUrl : 'templates/invoices/edit-3.html',
		controller : 'EditStep3InvoiceController'
	});
}]);

app.factory('Invoice', function($resource) {
	var responseInterceptor = function (response) {
		var resource = response.resource;
		
		if (resource.date)
			resource.date = new Date(resource.date);
		
		if (resource.due_date)
			resource.due_date = new Date(resource.due_date);
		
		return resource;
	};
	
	var requestTransformer = function (data, headersGetter) {
		var resource = angular.copy(data);
		
		if (resource.date)
			resource.date = resource.date.getFullYear()+'-'+(resource.date.getMonth()+1)+'-'+resource.date.getDate();
		
		if (resource.due_date)
			resource.due_date = resource.due_date.getFullYear()+'-'+(resource.due_date.getMonth()+1)+'-'+resource.due_date.getDate();
		
		return angular.toJson(resource);
	};
	
	return $resource('/api/invoices/:_id', {
		_id : "@_id"
	}, {
		get : {
			method  : 'GET',
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor }
		}, insert : {
			method  : 'POST',
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor },
			transformRequest : requestTransformer
		}, save : {
			method  : 'PUT',
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor },
			transformRequest : requestTransformer
		}, remove : {
			method  : 'DELETE',
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor }
		}, query : {
			method  : 'GET',
			isArray : true,
			headers : { 'Authorization' : 'Bearer ' + localStorage.access_token },
			interceptor: { response: responseInterceptor }
		}
	});
});

app.controller('InvoicesController', ['$scope', '$location', 'Invoice', function($scope, $location, Invoice) {
	$scope.invoices = Invoice.query({ sort : 'code,number' });
	$scope.remove = function (id) {
		if (!confirm("Are you sure you want to delete the invoice?"))
			return;
		
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
	$scope.invoice = Invoice.get({_id : $routeParams.id});
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

}]);

app.controller('AddInvoiceController', ['$scope', '$location', 'Invoice', 'Client', function($scope, $location, Invoice, Client) {
	var today  = new Date();
	today.setHours(0, 0, 0, 0);
	$scope.date = new Date(today.getTime());
	$scope.due_date = new Date(today.getTime());
	$scope.due_date.setDate($scope.due_date.getDate() + 5);
	Invoice.query({ sort : '-created_at', limit : 1}, function (result) {
		if (result && result.length > 0) {
			var invoice = result[0];
			if (!$scope.code)
				$scope.code = invoice.code;
			if (!$scope.number)
				$scope.number = parseInt(invoice.number) + 1;
		}
	});
	
	$scope.clients = Client.query();
	$scope.client = {};
	$scope.select_client = function () {
		if ($scope.source_client) {
			$('.client-details').hide();
			$('.edit-client-info').show();
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
			$('.client-details').show();
			$('.edit-client-info').hide();
		}
	};
	$scope.select_client();
	$scope.submit = function () {
		if (!$scope.number || $scope.number.length < 1)
			return; //not sure if needed; data already validated
		
		var invoice = new Invoice({
			code      : $scope.code,
			number    : $scope.number,
			date      : $scope.date,
			due_date  : $scope.due_date,
			client    : $scope.client
		});
		invoice.$insert(function (res) {
			if (res.$resolved !== true)
				return;
			
			$location.path('/invoices/edit-2/' + res._id);
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
			$scope.select_client();
		});
	});
	$scope.select_client = function () {
		if ($scope.source_client) {
			$('.client-details').hide();
			$('.edit-client-info').show();
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
			$('.client-details').show();
			$('.edit-client-info').hide();
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
		
		if ($scope.source_product && $scope.source_product._id) {
			
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
	$scope.remove_product = function (i) {
		$scope.invoice.products.splice(i, 1);
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
			$location.path('/invoices/edit-3/' + $routeParams.id);
		}).error(function (response) {
			console.log(response);
			alert(response);
		});
	};
}]);

app.controller('EditStep3InvoiceController', ['$scope', '$location', '$routeParams', 'Invoice', function($scope, $location, $routeParams, Invoice) {
	$scope.invoice = Invoice.get({_id : $routeParams.id});
	$scope.submit = function () {
		$scope.invoice.$save(function () {
			$location.path('/invoices/show/' + $routeParams.id);
		}, function (err) {
			console.log(err.data);
			alert(err.data.message);
		});
	};
}]);
