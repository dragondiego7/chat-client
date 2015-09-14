"use strict";

angular.module("chat.home", []).config(
[ "$routeProvider", function($routeProvider) {
	$routeProvider.when("/", {
		controller : "HomeController",
		templateUrl : "application/modules/home/partials/home.tpl.html"
	});
} ])
.factory("chatService", function() {
	return {
		
	}
})
.directive('myKeypressEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.myKeypressEnter);
                });

                event.preventDefault();
            }
        });
    };
})
.controller("HomeController",
[ "$scope", "$http", "$cookies", function($scope, $http, $cookies) {

	var _this = this;

	var Contato = function(login) {
		this.login = login;
		this.status = 0;
		this.historico = [];
		this.msgsNaoLidas = 0;
	}

	// Obtém usuário logado
	$scope.usuario = $cookies.getObject("usuario");

	// Inicializa lista de contatos
	$scope.contatos = [];

	// Inicializa destinatário
	$scope.destinatario = undefined;

	/*
	 * Carrega contatos do usuário
	 */
	$http.get('api/v1/usuario.json').then(function(response) {
		response.data.usuarios.forEach(function(usuario) {
			var contato = new Contato(usuario.login);
			contato.avatar = usuario.avatar;
			$scope.contatos.push(contato);
		});
	});

	/*
	 * Busca um contato do usuário
	 */
	var buscaContato = function(login, callback) {
		for ( var i in $scope.contatos) {
			if ($scope.contatos[i].login === login) {
				if (callback !== undefined)
					callback($scope.contatos[i]);
			}
		}
	}

	/*
	 * Emite sinal de presença a outros usuários
	 */
	var emitePresenca = function() {
		var presenca = {
			tipo : "mensagem-presenca",
			corpo : {
				"login" : $scope.usuario.login,
				"status" : 1
			}
		}

		$scope.conn.emit("send-server", presenca);
	}

	/*
	 * Trata sinais de presença recebidos
	 */
	var recebePresenca = function(mensagemPresenca) {
		buscaContato(mensagemPresenca.corpo.login, function(contato) {
			contato.status = mensagemPresenca.corpo.status;
			$scope.$apply();
		});
	}

	/*
	 * Trata o recebimento de mensagens
	 */
	var recebeMensagem = function(mensagemChat) {
		buscaContato(mensagemChat.corpo.de, function(contato) {
			if ($scope.destinatario !== undefined && $scope.destinatario.login !== mensagemChat.corpo.de) {
				contato.msgsNaoLidas++;
			}

			mensagemChat.tipo = "mensagem-recebida";
			contato.historico.push(mensagemChat);
			$scope.$apply();
		});
	}

	$scope.conn = io.connect("http://192.168.25.104:3000");
	$scope.conn.on("connect", function() {
		$scope.conn.on("mensagem-presenca", function(mensagemPresenca) {
			recebePresenca(mensagemPresenca);
		});

		$scope.conn.on("mensagem-chat", function(mensagemChat) {
			recebeMensagem(mensagemChat);
		});

		emitePresenca();
	});
	
	$scope.exibeContatos = function() {
		$('.col-left').toggleClass('hidden-xs');
		$('.col-right').toggleClass('hidden-xs');
	}

	/*
	 * Inicia uma conversa com um usuário
	 */
	$scope.iniciaConversa = function(loginDestinatario) {
		buscaContato(loginDestinatario, function(destinatario) {
			$('.col-left').toggleClass('hidden-xs');
			$('.col-right').toggleClass('hidden-xs');
			destinatario.msgsNaoLidas = 0;
			$scope.destinatario = destinatario;
		});
	}

	/*
	 * Envia uma mensagem a outro usuário
	 */
	$scope.enviaMensagem = function() {
		var objMensagem = $('#mensagem');
		var corpoMensagem = objMensagem.val()

		var mensagem = {
			tipo : 'mensagem-chat',
			corpo : {
				"de" : $scope.usuario.login,
				"para" : $scope.destinatario.login,
				"dtHrMensagem" : new Date(),
				"mensagem" : corpoMensagem
			}
		}

		$scope.conn.emit("send-server", mensagem);

		mensagem.tipo = "mensagem-enviada";
		buscaContato($scope.destinatario.login, function(destinatario) {
			destinatario.historico.push(mensagem);
		});

		objMensagem.val("");
		objMensagem.focus();
	}
} ]);