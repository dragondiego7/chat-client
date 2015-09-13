"use strict";

angular.module("chat.login", [])
.controller("LoginController", ["$scope", "$http", "$cookies", "$location", function($scope, $http, $cookies, $location) {
	$scope.entrar = function(login, senha) {
		$http.get("api/v1/usuario.json").then(function(response) {
			var usuarios = response.data.usuarios;
			
			usuarios.forEach(function(usuario) {
				if(usuario.login == login) {
					$cookies.putObject("usuario", usuario);
					$cookies.put("access_token", "xablablau1");
					$location.path("/");
				}
			});
			
			$scope.msgErro = "Login/senha inválido";
		});
	}
}])
.config(["$routeProvider", "$httpProvider",
function($routeProvider, $httpProvider) {
	$routeProvider.when("/login", {
		controller: "LoginController",
		templateUrl: "application/modules/login/partials/login.tpl.html"
	});
	
	// Adiciona uma função ao interceptador de requisições para verificar se o usuário está lgado
	$httpProvider.interceptors.push(["$q", "$location", "$cookies",
	function($q, $location, $cookies) {
		return {
			'request' : function(config) {
				// Verifica se o usuário está logado
				if ($cookies.get("access_token") === undefined) {
					$location.path("/login");
				}

				// Caso ele esteja, adicionar o token ao header de todas as requisições
				$httpProvider.defaults.headers.common['Authorization'] = 'Bearer ' + $cookies.access_token;
				return config;
			}
		};
	}]);
}]); 