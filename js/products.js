"use strict";
var app = angular.module('facturi.products', ['ngRoute', 'ngResource']);

app.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/products', {
		templateUrl : 'templates/products/index.html',
		controller : 'ProductsController'
	}).when('/products/show/:id', {
		templateUrl : 'templates/products/get.html',
		controller : 'GetProductController'
	}).when('/products/add', {
		templateUrl : 'templates/products/add.html',
		controller : 'AddProductController'
	}).when('/products/edit/:id', {
		templateUrl : 'templates/products/edit.html',
		controller : 'EditProductController'
	});
}]);

app.factory('Product', function($resource) {
	return $resource('/api/products/:_id', {
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

app.controller('ProductsController', ['$scope', '$location', 'Product', function($scope, $location, Product) {
	$scope.message = 'This is list products screen';
	$scope.products = Product.query();
	$scope.remove = function (id) {
		if (!confirm("Are you sure you want to delete the product?"))
			return;
		
		Product.remove({ _id : id }, function (r) {
			for (var i = 0; i < $scope.products.length; i++)
				if ($scope.products[i]._id == id) {
					$scope.products.splice(i, 1);
					break;
				}
		});
	};
}]);

app.controller('GetProductController', ['$scope', '$location', '$routeParams', 'Product', function($scope, $location, $routeParams, Product) {
	$scope.message = 'This is show product screen';
	$scope.product = Product.get({_id : $routeParams.id});
}]);

app.controller('AddProductController', ['$scope', '$location', 'Product', function($scope, $location, Product) {
	$scope.message = 'This is add product screen';
	$scope.submit = function () {
		if (!$scope.name || $scope.name.length < 1)
			return;
		
		var product = new Product({
			name  : $scope.name,
			price : $scope.price
		});
		product.$insert(function (res) {
			if (res.$resolved !== true)
				return;
			
			$location.path('/products');
		});
	};
}]);

app.controller('EditProductController', ['$scope', '$location', '$routeParams', 'Product', function($scope, $location, $routeParams, Product) {
	$scope.message = 'This is edit product screen';
	$scope.product = Product.get({_id : $routeParams.id});
	$scope.submit = function () {
		$scope.product.$save(function () {
			$location.path('/products');
		});
	};
}]);
