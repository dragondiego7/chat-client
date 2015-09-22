"use strict";

angular.module("chat.home", []).config(
[ "$routeProvider", function($routeProvider) {
	$routeProvider.when("/", {
		controller : "HomeController",
		templateUrl : "application/modules/home/partials/home.tpl.html"
	});
} ])
.factory("chatService", ["$http", "config", function($http, config) {
	
	// Inicializa variável que irá conter a conexão com o serv websocket
	var _this = this;
	var conn = null;
	var usuario = null;
	var contatos = null;
	
	var Contato = function(login) {
		this.login = login;
		this.status = 0;
		this.historico = [];
		this.msgsNaoLidas = 0;
	}
		
	/*
	 * Busca um contato do usuário
	 */
	var buscaContato = function(login, callback) {
		for ( var i in contatos) {
			if (contatos[i].login === login) {
				if (callback !== undefined)
					callback(contatos[i]);
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
				"login" : _this.usuario.login,
				"status" : 1
			}
		}

		conn.emit("send-server", presenca);
	}

	/*
	 * Trata sinais de presença recebidos
	 */
	var _recebePresenca = undefined;
	var recebePresenca = function(mensagemPresenca) {
		buscaContato(mensagemPresenca.corpo.login, function(contato) {
			contato.status = mensagemPresenca.corpo.status;
			
			if(_recebePresenca !== undefined)
				_recebePresenca(mensagemPresenca);
		});
	}
	
	/*
	 * Trata o recebimento de mensagens
	 */
	var _recebeMensagem = undefined;
	var recebeMensagem = function(mensagemChat) {
		buscaContato(mensagemChat.corpo.de, function(contato) {
			if ($scope.destinatario !== undefined && $scope.destinatario.login !== mensagemChat.corpo.de) {
				contato.msgsNaoLidas++;
			}

			mensagemChat.tipo = "mensagem-recebida";
			contato.historico.push(mensagemChat);
			
			if(_recebeMensagem !== undefined)
				_recebeMensagem(mensagemChat);
		});
	}
	

	
	return {
		on: function(arg, callback) {
			switch(arg0) {
			case 'recebe-presenca':
				_recebePresenca = callback;
				break;
			case 'recebe-mensagem':
				_recebeMensagem = callback;
				break;
			}
		},
		inicia: function(usuario) {
			_this.usuario = usuario;
			conn = io.connect("http://env-5323080.jelasticlw.com.br:8080");
			conn.on("connect", function() {
				conn.on("mensagem-presenca", function(mensagemPresenca) {
					recebePresenca(mensagemPresenca);
				});

				conn.on("mensagem-chat", function(mensagemChat) {
					recebeMensagem(mensagemChat);
				});

				emitePresenca();
			});
			
		},
		obtemContatos: function(id, callback) {
			$http.get(config.API.url + "/amizade/" + id).then(function(response) {
				var contatos = [];
				response.data.amizades.forEach(function(usuario) {
					var contato = new Contato(usuario.login);
					contato.avatar = usuario.avatar;
					contatos.push(contato);
					_this.contatos = contatos;
				});
				
				callback(contatos);
			});
		},
		enviaMensagem: function(destinatario, mensagem) {
			var objMensagem = {
					tipo: 'mensagem-chat',
					corpo: {
						de: '',
						para: destinatario,
						
					}
			}
		}
	}
}])
.controller("HomeController",
[ "$scope", "$http", "$cookies", "config", function($scope, $http, $cookies, config) {

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
	$http.get(config.API.url + "/amizade/" + $scope.usuario.id).then(function(response) {
		response.data.amizades.forEach(function(usuario) {
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

	$scope.conn = io.connect("http://env-5323080.jelasticlw.com.br:8080");
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
		
		var mensagens = $('#mensagens');
		
		mensagens.animate({'scrollTop': mensagens.prop('scrollHeight')}, 100);
	}
}]);