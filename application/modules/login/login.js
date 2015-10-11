"use strict";

angular.module("chat.login", [])
.controller("LoginController", ["$scope", "$http", "$cookies", "$location", "config", function($scope, $http, $cookies, $location, config) {
		
	// Verifica se o usuário está logado
	if ($cookies.get("access_token") !== undefined) {
		$location.path("/");
	}
	
	$scope.entrar = function(usuarioLogin) {
		var request = {
				"grant_type": "password",
				"login": usuarioLogin.login,
				"senha": usuarioLogin.senha,
				"client_id": config.API.credenciais.client_id,
				"client_secret": config.API.credenciais.client_secret
		}
		
		$http.post(config.API.url + '/autenticacao', request).then(function(response) {
			if(response.data.access_token !== undefined) {
				$cookies.put("access_token", response.data.access_token);
				$cookies.put("refresh_token", response.data.refresh_token);
				
				usuarioLogin.id = response.data.user_id;
				
				$cookies.putObject("usuario", usuarioLogin);
				$location.path("/");
			}
			
			$scope.loginErrorMsg = "Login/senha inválido";
		}, function() {
			$scope.loginErrorMsg = "Serviço temporáriamente indisponível";
		});
	}
	
	$scope.cadastrar = function(usuario) {
		var copiaDeUsuario = angular.copy(usuario);
		delete copiaDeUsuario.confirmaSenha;
		
		$http.post(config.API.url + '/usuario', copiaDeUsuario).then(function(response) {
			if(response.data.success) {
				console.log(usuario);
				$scope.entrar(usuario);
			} else {
				$scope.cadastrarErrorMsg = response.data.mensagem;
			}
		}, function() {
			$scope.cadastrarErrorMsg = "Serviço temporáriamente indisponível";
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