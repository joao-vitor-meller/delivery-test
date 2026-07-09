import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Produto } from '../database/entities/produto.entity';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Products')
@Auth(Role.ADMIN)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um novo produto (ADMIN)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Produto criado com sucesso',
    type: Produto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos os produtos (ADMIN)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de produtos',
    type: [Produto],
  })
  findAll() {
    return this.productsService.findAll();
  }

  @ApiExcludeEndpoint()
  @Get(':id')
  @ApiOperation({ summary: 'Busca um produto pelo id (ADMIN)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador do produto',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Produto encontrado',
    type: Produto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Produto não encontrado',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @ApiExcludeEndpoint()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um produto existente (ADMIN)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador do produto',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Produto atualizado com sucesso',
    type: Produto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Produto não encontrado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um produto (ADMIN)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador do produto',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Produto removido com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Produto não encontrado',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
