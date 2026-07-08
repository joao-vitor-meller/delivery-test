import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produto } from '../database/entities/produto.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Produto)
    private readonly productsRepository: Repository<Produto>,
  ) {}

  create(createProductDto: CreateProductDto): Promise<Produto> {
    const produto = this.productsRepository.create({
      nome: createProductDto.nome,
      preco: createProductDto.preco.toFixed(2),
    });
    return this.productsRepository.save(produto);
  }

  findAll(): Promise<Produto[]> {
    return this.productsRepository.find();
  }

  async findOne(id: number): Promise<Produto> {
    const produto = await this.productsRepository.findOneBy({ id });
    if (!produto) {
      throw new NotFoundException(`Produto #${id} não encontrado`);
    }
    return produto;
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Produto> {
    const produto = await this.findOne(id);

    if (updateProductDto.nome !== undefined) {
      produto.nome = updateProductDto.nome;
    }
    if (updateProductDto.preco !== undefined) {
      produto.preco = updateProductDto.preco.toFixed(2);
    }

    return this.productsRepository.save(produto);
  }

  async remove(id: number): Promise<void> {
    const produto = await this.findOne(id);
    await this.productsRepository.remove(produto);
  }
}
