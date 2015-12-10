"use strict";

angular.module("chat.home", []).config(
[ "$routeProvider", "$httpProvider", function($routeProvider, $httpProvider) {
	$routeProvider.when("/", {
		controller : "HomeController",
		templateUrl : "application/modules/home/partials/home.tpl.html"
	});
	
    $httpProvider.defaults.headers.common['Cache-Control'] = 'no-cache';
    $httpProvider.defaults.headers.common['Pragma'] = 'no-cache';
}])
.controller("HomeController",
[ "$scope", "$http", "$location", "config", function($scope, $http, $location, config) {

//	$scope.$on('$routeChangeStart', function (scope, next, current) {
//        // Show here for your model, and do what you need**
//        emitePresenca();
//    });
	
	$scope.$on('$locationChangeStart', function(event, next, current){            
	    // Prevent the browser default action (Going back):
		$scope.exibeContatos();
	    event.preventDefault();            
	});
	
	$scope.mobile = false;
	
	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		$scope.mobile = true;
	}
	
	var _this = this;
	var limit = 10;
	var offset = 0;
	var carregandoMensagens = false;

	var Contato = function(login) {
		this.id;
		this.login = login;
		this.status = 0;
		this.historico = [];
		this.historicoOffset = 0;
		this.msgsNaoLidas = 0;
	}

	// Obtém usuário logado
	$scope.usuario = JSON.parse(localStorage.getItem("usuario"));
	
	// Inicializa lista de contatos
	$scope.solicitacoesAmizadeRecebidas = [];
	$scope.solicitacoesAmizadeEnviadas = [];
	$scope.resultadoPesquisa = [];
	$scope.contatos = [];

	// Inicializa destinatário
	$scope.destinatario = undefined;	
	
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
				"id": $scope.usuario.id,
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
		$scope.contatos.forEach(function(contato, chave) {
			if(contato.id == mensagemChat.corpo.de) {
				if($scope.destinatario == undefined || $scope.destinatario.id != contato.id) {
					$scope.contatos[chave].msgsNaoLidas++;
				}
				
				mensagemChat.tipo = "mensagem-recebida";
				$scope.contatos[chave].historico.push(mensagemChat);
				$scope.contatos[chave].historicoOffset++;
				
				$('#mensagens').animate({'scrollTop': $('#mensagens').prop('scrollHeight')}, 100);
			}
			
		});
		
		$scope.$apply();
	}
	
	var recebeSolicitacaoAmizade = function(solicitacaoAmizade) {
		if($scope.solicitacoesAmizadeRecebidas.length > 0) {
			var count = 0;
			
			for(var i = 0; i < $scope.solicitacoesAmizadeRecebidas.length; i++) {
				if($scope.solicitacoesAmizadeRecebidas[i] !== undefined) {
					if($scope.solicitacoesAmizadeRecebidas[i].id == solicitacaoAmizade.corpo.solicitanteId) {
						count++;
						$scope.solicitacoesAmizadeRecebidas[i].solicitacaoPendente = solicitacaoAmizade.corpo;
					} 
					
					if(i == $scope.solicitacoesAmizadeRecebidas.length - 1) {
						if(count == 0) {
							var contato = new Contato(solicitacaoAmizade.corpo.solicitanteLogin);
							contato.id = solicitacaoAmizade.corpo.solicitanteId;
							contato.avatar = 'assets/img/anonimo.jpg';
							contato.solicitacaoPendente = solicitacaoAmizade.corpo;
							
							$scope.solicitacoesAmizadeRecebidas.push(contato);
							$scope.$apply();
						} 
					}
				}
			}
		} else {
			var contato = new Contato(solicitacaoAmizade.corpo.solicitanteLogin);
			contato.id = solicitacaoAmizade.corpo.solicitanteId;
			contato.avatar = 'assets/img/anonimo.jpg';
			contato.solicitacaoPendente = solicitacaoAmizade.corpo;
			
			$scope.solicitacoesAmizadeRecebidas.push(contato);
			$scope.$apply();
		}
	}
	
	var recebeSolicitacaoAmizadeAceita = function(respostaSolicitacao) {		
		$scope.solicitacoesAmizadeEnviadas.forEach(function(contato, chave) {
			if(contato.id == respostaSolicitacao.corpo.solicitadoId) {
				$scope.solicitacoesAmizadeEnviadas.splice(chave, 1);
			} 
		});
		
		$http.get(config.API.url + '/usuario/' + respostaSolicitacao.corpo.solicitadoId).then(function(response) {
			if(response.data.success == true) {
				var usuario = response.data.usuario;
				var contato = new Contato(usuario.login);
				contato.id = usuario.id;
				contato.status = 1;
				contato.avatar = 'assets/img/anonimo.jpg';
				
				$scope.contatos.push(contato);
			}
			
		}, function() {
			
		});
		
		$scope.resultadoPesquisa.forEach(function(contato, chave) {
			if(contato.id == respostaSolicitacao.corpo.solicitadoId) {
				$scope.resultadoPesquisa.splice(chave, 1);
			}
		});
		
		$scope.$apply();
	}
	
	$scope.exibeContatos = function() {
		$('.col-left').toggleClass('hidden-xs');
		$('.col-right').toggleClass('hidden-xs');
		$scope.destinatario = null;
	}

	var carregaHistorico = function(loginDestinatario, limit, offset, callback) {
		carregandoMensagens = true;
		$(".carregandoMensagens").show();
		
		$http.get(config.API.url + "/historico/" + $scope.usuario.id + "/" + $scope.destinatario.id + '/' + limit + '/' + offset).then(function(resposta) {
			var mensagens = resposta.data.mensagens;
			
			if(mensagens.length > 0) {
				buscaContato(loginDestinatario, function(destinatario) {
					mensagens.forEach(function(mensagem, i){					
						var objMensagem = {
							tipo: 'mensagem-chat',
							corpo: {
								"de": mensagem.remetente_id,
								"para": mensagem.destinatario_id,
								"dtHrMensagem": mensagem.criado_em,
								"mensagem": mensagem.mensagem
							}
						}
						
						if(mensagem.remetente_id == $scope.usuario.id) {
							objMensagem.tipo = 'mensagem-enviada';
						} else {
							objMensagem.tipo = 'mensagem-recebida';
						}
						
						destinatario.historico.unshift(objMensagem);
						
						if(mensagens.length - 1 == i) {
							carregandoMensagens = false;
							
							if(callback !== undefined) {
								callback();
							}
						}
						
						destinatario.historicoOffset++;
						$(".carregandoMensagens").hide();
					});
				});
			} else {
				carregandoMensagens = false;
				$(".carregandoMensagens").hide();
				
				if(callback !== undefined) {
					callback();
				}
			} 
		});
	}
	
	// Carrega histórico dinamicamente
	$("#mensagens").scroll(function() {
		var _this = $(this);
		if($(this).prop('scrollTop') == 0 && carregandoMensagens == false) {
			carregaHistorico($scope.destinatario.login, 10, $scope.destinatario.historicoOffset, function() {
				_this.animate({'scrollTop': 20}, 100);
			});
		}
	});
	
	/*
	 * Inicia uma conversa com um usuário
	 */
	$scope.iniciaConversa = function(loginDestinatario) {
		buscaContato(loginDestinatario, function(destinatario) {
			$('.col-left').toggleClass('hidden-xs');
			$('.col-right').toggleClass('hidden-xs');
			destinatario.msgsNaoLidas = 0;
			$scope.destinatario = destinatario;
			var offset = destinatario.historicoOffset > 0 ? destinatario.historicoOffset : 0;
			
			carregaHistorico(loginDestinatario, 10, offset, function() {
				setTimeout(function() {
					var divMensagens = $("#mensagens");
					divMensagens.animate({'scrollTop': divMensagens.prop('scrollHeight')}, 100);
				}, 100);
			});
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
				"de" : $scope.usuario.id,
				"para" : $scope.destinatario.id,
				"dtHrMensagem" : new Date(),
				"mensagem" : corpoMensagem
			}
		}
		
		$scope.conn.emit("send-server", mensagem);

		mensagem.tipo = "mensagem-enviada";
		buscaContato($scope.destinatario.login, function(destinatario) {
			destinatario.historico.push(mensagem);
			destinatario.historicoOffset++;
		});

		objMensagem.val("");
		objMensagem.focus();
		
		var mensagens = $('#mensagens');
		
		mensagens.animate({'scrollTop': mensagens.prop('scrollHeight')}, 100);
	}
	
	$scope.procuraContato = function(contato) {
		// TODO: organizar o recebimento do parâmetro
		var contato = $scope.contatoProcurado;
		$scope.resultadoPesquisa = [];
		
		$('.carregandoProcurar').show();
		$http.get(config.API.url + "/amizade/busca/" + $scope.usuario.id + "/"  + contato).then(function(response) {
			response.data.usuarios.forEach(function(usuario) {
				var contato = new Contato(usuario.login);
				contato.id = usuario.id;
				contato.status = -1;
				contato.avatar = 'assets/img/anonimo.jpg';
				contato.solicitacaoPendente = usuario.solicitacaoPendente;
				$scope.resultadoPesquisa.push(contato);
			});
			
			$('.carregandoProcurar').hide();
		});
	}
	
	$scope.adicionaContato = function(contato) {
		var solicitacaoAmizade = {
			'solicitanteId': $scope.usuario.id,
			'solicitanteLogin': $scope.usuario.login,
			'solicitanteAvatar': $scope.usuario.avatar,
			'solicitadoId': contato.id
		}
		
		var mensagemSolicitacaoAmizade = {
			tipo: 'mensagem-solicitacao-amizade',
			corpo: solicitacaoAmizade
		}
		
		var btnAdicionar = $('.btn-adicionar[data-contato-id="' + contato.id + '"]');
		btnAdicionar.html("enviando solicitação");
		$('.carregandoSolicitacao[data-contato-id="' + contato.id + '"').show();
		
		$scope.conn.emit('send-server', mensagemSolicitacaoAmizade);
	}
	
	$scope.limpaBusca = function() {
		$scope.resultadoPesquisa = [];
		$scope.contatoProcurado = '';
	}
	
	$scope.aceitaSolicitacaoAmizade = function(contato) {
		$('.solicitacao-amizade[data-contato-id="' + contato.id + '"] .media .media-body span').remove();
		$('.carregandoSolicitacao[data-contato-id="' + contato.id + '"').show();
		
		var respostaSolicitacao = {
			tipo: 'mensagem-solicitacao-amizade-aceita',
			corpo: { 
				id: contato.solicitacaoPendente.id,
				solicitanteId: contato.id,
				solicitadoId: $scope.usuario.id
			}
		}
		
		$scope.conn.emit('send-server', respostaSolicitacao);
	}
	
	$scope.recusaSolicitacaoAmizade = function(contato) {
		$('.solicitacao-amizade[data-contato-id="' + contato.id + '"] .media .media-body span').remove();
		$('.solicitacao-amizade[data-contato-id="' + contato.id + '"] .carregandoSolicitacao[data-contato-id="' + contato.id + '"').show();
		
		var req = {
			 method: 'PUT',
			 url: config.API.url + "/amizade/solicitacao/" + contato.solicitacaoPendente.id,
			 headers: {
				 'Content-Type': 'application/x-www-form-urlencoded'
			 },
			 data: $.param({situacao: 'R'})
		}
		
		$http(req).then(function() {
			$scope.solicitacoesAmizadeRecebidas.forEach(function(c, chave) {
				if(contato.id == c.id) {
					$scope.solicitacoesAmizadeRecebidas.splice(chave, 1);
				}
			});
			$('.carregandoSolicitacao[data-contato-id="' + contato.id + '"').hide();
		});
		
	}
	
	$scope.cancelaSolicitacaoAmizade = function(contato) {
		$('.carregandoSolicitacao[data-contato-id="' + contato.id + '"').show();
		
		var req = {
				 method: 'PUT',
				 url: config.API.url + "/amizade/solicitacao/" + contato.solicitacaoPendente.id,
				 headers: {
					 'Content-Type': 'application/x-www-form-urlencoded'
				 },
				 data: $.param({situacao: 'C'})
			}
			
		$http(req).then(function(response) {
			$scope.resultadoPesquisa.forEach(function(c, chave) {
				if(c.id == contato.id) {
					var atualizaContato = new Contato(contato.login);
					atualizaContato.id = contato.id;
					atualizaContato.avatar = contato.avatar;
					atualizaContato.solicitacaoPendente = null;
					$scope.resultadoPesquisa[chave] = atualizaContato;
					$('.carregandoSolicitacao[data-contato-id="' + contato.id + '"').hide();
				}
			});
		});
	}
	
	$scope.fechaSolicitacaoAmizade = function(contato) {
		contato.ignora = 1;
	}

	var carregaContatos = function(callback) {
		$http.get(config.API.url + "/amizade/" + $scope.usuario.id).then(function(response) {
			response.data.amizades.forEach(function(usuario) {
				var contato = new Contato(usuario.login);
				contato.id = usuario.id;
				contato.avatar = usuario.avatar;
				$scope.contatos.push(contato);
			});
			
			callback();
		});
	}
		
	var conectaWebSocket = function() {
		$scope.conn = io.connect(config.SERVER.addr);
		
		var exibeMensagemErro = function() {
			$('#modal-msg-erro').modal();
		}
		
		$scope.conn.on("connect_timeout", function() {
			exibeMensagemErro();
		});
		
		$scope.conn.on("connect_error", function() {
			exibeMensagemErro();
		})
		
		$scope.conn.on("connect", function() {
			$scope.conn.on("mensagem-presenca", function(mensagemPresenca) {
				recebePresenca(mensagemPresenca);
			});
	
			$scope.conn.on("mensagem-chat", function(mensagemChat) {
				recebeMensagem(mensagemChat);
			});
			
			$scope.conn.on("mensagem-solicitacao-amizade", function(mensagemSolicitacaoAmizade) {
				recebeSolicitacaoAmizade(mensagemSolicitacaoAmizade);
			});
			
			$scope.conn.on("mensagem-solicitacao-amizade-aceita", function(respostaSolicitacao) {
				recebeSolicitacaoAmizadeAceita(respostaSolicitacao);
			});
			
			$scope.conn.on("mensagem-solicitacao-amizade-confirma", function(solicitacaoAmizadeConfirma) {
				$scope.resultadoPesquisa.forEach(function(contato, key) {
					if(contato.id == solicitacaoAmizadeConfirma.corpo.solicitadoId) {
						$scope.solicitacoesAmizadeEnviadas.push(contato);					
						contato.solicitacaoPendente = solicitacaoAmizadeConfirma.corpo;
						$scope.$apply();
					}
				});
				
				$('.carregandoSolicitacao[data-contato-id="' + solicitacaoAmizadeConfirma.corpo.solicitadoId + '"').hide();
			});
			
			$scope.conn.on("mensagem-solicitacao-amizade-aceita-confirma", function(solicitacaoAmizadeConfirma) {
				$('.carregandoSolicitacao[data-contato-id="' + solicitacaoAmizadeConfirma.corpo.solicitanteId + '"').hide();
				
				$scope.solicitacoesAmizadeRecebidas.forEach(function(contato, key) {
					if(contato.id == solicitacaoAmizadeConfirma.corpo.solicitanteId) {
						contato.status = 1;
						$scope.contatos.push(contato);
						$scope.solicitacoesAmizadeRecebidas.forEach(function(c, chave) {
							if(contato.id == c.id) {
								$scope.solicitacoesAmizadeRecebidas.splice(chave, 1);
							}
						});
					}
				});
				
				$scope.$apply();
			});
			
			$scope.conn.on("mensagem-solicitacao-amizade-aceita-erro", function(solicitacaoAmizadeErro) {
				$('.carregandoSolicitacao[data-contato-id="' + solicitacaoAmizadeErro.corpo.solicitanteId + '"').hide();
				$('.solicitacao-amizade[data-contato-id="' + solicitacaoAmizadeErro.corpo.solicitanteId  +  '"] .media-body span').remove();
				$('.solicitacao-amizade[data-contato-id="' + solicitacaoAmizadeErro.corpo.solicitanteId  +  '"] .media-body p').html("Ops... esta solicitação já foi cancelada!");

				var timeout = setTimeout(function() {
					$scope.solicitacoesAmizadeRecebidas.forEach(function(contato, key) {
						if(contato.id == solicitacaoAmizadeErro.corpo.solicitanteId) {
							$scope.solicitacoesAmizadeRecebidas.forEach(function(c, chave) {
								if(contato.id == c.id) {
									$scope.solicitacoesAmizadeRecebidas.splice(chave, 1);
								}
							});
						}
					});
					
					$('.solicitacao-amizade[data-contato-id="' + solicitacaoAmizadeErro.corpo.solicitanteId + '"]').fadeOut(500);
				}, 1500);
				
			});
	
			emitePresenca();
		});
	}
	
	$scope.logout = function() {
		try {
			$scope.conn.close();
		} finally {
			localStorage.removeItem("access_token");
			localStorage.removeItem("refresh_token");
			localStorage.removeItem("usuario");
			location.reload();			
		}
		
	}
	
	/*
	 * Carrega contatos do usuário
	 */
	var inicia = function() {
		var promise = new Promise(function(resolve, reject) {
			carregaContatos(resolve);
		});
		
		promise.then(function() {
			conectaWebSocket();
			$scope.solicitacoesAmizade = [];
			$http.get(config.API.url + "/amizade/solicitacao/" + $scope.usuario.id).then(function(response) {
				response.data.solicitacoes.forEach(function(solicitacao) {
					var usuario = solicitacao.usuario;
					var contato = new Contato(usuario.login);
					contato.id = usuario.id;
					contato.avatar = 'assets/img/anonimo.jpg';
					contato.solicitacaoPendente = solicitacao;
					$scope.solicitacoesAmizadeRecebidas.push(contato);
				});
			});
		});
	}
	
	inicia();
}]);