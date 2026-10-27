export class CriarUsuarioDto {
  nome?: string;
  email: string;
  senha: string;
  perfil?: 'ADMIN' | 'FUNCIONARIO';
}

export class AtualizarUsuarioDto {
  nome?: string;
  senha?: string;
  perfil?: 'ADMIN' | 'FUNCIONARIO';
  ativo?: boolean;
}
